#!/usr/bin/env python3
"""Turn a 4-build pixel-art car sheet into game data (www/js/sheet_<id>.js).

  python3 tools/carsheet.py tools/carsheets/<id>.json build [preview_dir]

The sheet: one transparent PNG (1536 x 1024 or similar) with four side views
facing right in a 2 x 2 grid: stock (top left), street (top right), widebody
(bottom left), race (bottom right), all one paint colour (the race build
carries a livery on top).

Each build is cut out by its alpha, its wheels found from the tire
footprints, scaled so every build has the stock car's wheelbase and the car
is its real length at the game's sprite density (2 px per game pixel, 44 px
per metre at 1x), its colours cleaned up to a palette and its body paint
marked as paint-ramp steps (p0 brightest .. p6 darkest) so the game can
apply any paint colour. Wings and roof spoilers are cut off the three
modified builds as overlays (the body shop's spoiler slot), placed relative
to the roof and the rear wheel.

Config (tools/carsheets/<id>.json):
  id        game car id (DR.CARS key)
  sheet     the PNG
  lenM      the car's real length in metres
  paint     {"hue": [from, to], "minSat": s, "minVal": v} body paint hue range
            (wraps through 0 for reds: [0.94, 0.04])
"""
import json, sys, os, colorsys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

DENS = 2            # sheet pixels per game sprite pixel at res 1
PPM = 44
NAMES = ('stock', 'street', 'wide', 'race')
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def components(m, min_px):
    """Connected blobs of a mask (4-neighbour), biggest first."""
    lab = np.zeros(m.shape, np.int32); out = []; n = 0
    for sy, sx in zip(*np.where(m)):
        if lab[sy, sx]: continue
        n += 1; q = deque([(sy, sx)]); lab[sy, sx] = n; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; q.append((yy, xx))
        if len(pts) >= min_px: out.append(pts)
    return sorted(out, key=len, reverse=True)


def cut_builds(img):
    """The four builds: RGBA crops, from the quadrants of the sheet."""
    H, W = img.shape[:2]
    quads = [(0, 0, W // 2, H // 2), (W // 2, 0, W, H // 2), (0, H // 2, W // 2, H), (W // 2, H // 2, W, H)]
    out = []
    for (x0, y0, x1, y1) in quads:
        sub = img[y0:y1, x0:x1]
        a = sub[..., 3] > 127
        keep = np.zeros_like(a)
        for pts in components(a, 150):          # the car (and any wing that floats free), no specks
            ys, xs = zip(*pts); keep[list(ys), list(xs)] = True
        ys, xs = np.where(keep)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        crop = sub[by0:by1, bx0:bx1].copy()
        crop[..., 3] = np.where(keep[by0:by1, bx0:bx1], crop[..., 3], 0)
        out.append(crop)
    return out


def wheels(crop):
    """[rear, front] wheel circles (cx, cy, r) from the tire footprints: the
    lowest pixel of each column right around a contact patch can only be
    tire, and a circle through those points is the tire."""
    a = crop[..., 3] > 127
    ys, xs = np.where(a); ground = ys.max()
    low = {}
    for x in range(a.shape[1]):
        col = np.where(a[:, x])[0]
        if len(col): low[x] = col.max()
    cols = [x for x, v in low.items() if v >= ground - 1]
    groups = []
    for x in cols:
        if groups and x - groups[-1][-1] <= 3: groups[-1].append(x)
        else: groups.append([x])
    groups = [g for g in groups if len(g) > 8]
    assert len(groups) >= 2, 'could not find two tire contact patches'
    groups = [groups[0], groups[-1]]
    wb = (groups[1][0] + groups[1][-1]) / 2 - (groups[0][0] + groups[0][-1]) / 2
    rgb = crop[..., :3].astype(float)
    def rubber(x, y):
        c = rgb[y, x]; L = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255
        return L < 0.3 and c.max() - c.min() < 40
    out = []
    for g in groups:
        cx = (g[0] + g[-1]) / 2 + 0.5; half = 0.1 * wb
        # bottom edge points that are tire rubber (skirts and bumpers are
        # paint or sit higher), then drop outliers and refit
        pts = [(x + 0.5 - cx, low[x] + 1.0) for x in range(int(cx - half), int(cx + half) + 1)
               if x in low and ground - low[x] < 0.12 * wb and rubber(x, low[x]) and rubber(x, max(0, low[x] - 2))]
        X = np.array([p_[0] for p_ in pts]); Y = np.array([p_[1] for p_ in pts])
        for it in range(3):
            cy, k = np.linalg.lstsq(np.c_[2 * Y, np.ones(len(Y))], X * X + Y * Y, rcond=None)[0]
            r = float(np.sqrt(k + cy * cy))
            res = np.abs(np.sqrt(X * X + (Y - cy) ** 2) - r)
            keep = res < max(1.0, np.percentile(res, 80))
            if keep.all() or keep.sum() < 8: break
            X, Y = X[keep], Y[keep]
        out.append((cx, cy, r))
    return out, ground + 1


def resample(crop, f):
    """Scale an RGBA crop by f with area averaging (colours weighted by alpha)."""
    h, w = crop.shape[:2]
    W, H = max(1, int(round(w * f))), max(1, int(round(h * f)))
    a = crop[..., 3:4].astype(float) / 255
    pre = np.concatenate([crop[..., :3] * a, a * 255], axis=2).astype(np.float32)
    chans = [np.asarray(Image.fromarray(pre[..., c]).resize((W, H), Image.BOX)) for c in range(4)]
    A = chans[3] / 255
    rgb = np.stack(chans[:3], axis=2) / np.maximum(A[..., None], 1e-6)
    return np.clip(rgb, 0, 255), A > 0.5


def hsv(rgb):
    out = np.zeros(rgb.shape)
    for y in range(rgb.shape[0]):
        for x in range(rgb.shape[1]):
            out[y, x] = colorsys.rgb_to_hsv(*(rgb[y, x] / 255))
    return out


def is_paint(hv, p):
    h, s, v = hv[..., 0], hv[..., 1], hv[..., 2]
    lo, hi = p['hue']
    inh = (h >= lo) | (h <= hi) if lo > hi else (h >= lo) & (h <= hi)
    return inh & (s >= p.get('minSat', 0.45)) & (v >= p.get('minVal', 0.18))


def build(cfg, prev_dir=None):
    img = np.asarray(Image.open(cfg['sheet']).convert('RGBA'))
    crops = cut_builds(img)
    info = [wheels(c) for c in crops]
    wb = [w[1][0] - w[0][0] for w, g in info]
    stock_len = crops[0].shape[1]
    f0 = cfg['lenM'] * PPM * DENS / stock_len
    builds = []
    for i, c in enumerate(crops):
        f = f0 * wb[0] / wb[i]          # every build gets the stock wheelbase
        rgb, a = resample(c, f)
        (wr, wf), ground = info[i]
        builds.append(dict(rgb=rgb, a=a, f=f, wheelR=[wr[0] * f, wr[1] * f, wr[2] * f], wheelF=[wf[0] * f, wf[1] * f, wf[2] * f],
                           ground=int(round(ground * f))))
        print('%-6s sheet wheelbase %.1f  scale %.3f  size %dx%d  wheels r %.1f / %.1f' % (NAMES[i], wb[i], f, a.shape[1], a.shape[0], wr[2] * f, wf[2] * f))

    # ---- paint: body-colour pixels become ramp steps by brightness, judged
    # against the stock car's paint (so every build shades the same)
    for b in builds:
        b['hsv'] = hsv(b['rgb']); b['paint'] = is_paint(b['hsv'], cfg['paint']) & b['a']
    base_v = float(np.median(builds[0]['hsv'][..., 2][builds[0]['paint']]))
    for b in builds:
        # brightness smoothed over neighbouring paint pixels (5x5), so the
        # art's soft noise turns into clean bands instead of speckle
        v = np.where(b['paint'], b['hsv'][..., 2], 0.0); m = b['paint'].astype(float)
        def box(a):
            p_ = np.pad(a, 2); return sum(p_[dy:dy + a.shape[0], dx:dx + a.shape[1]] for dy in range(5) for dx in range(5))
        vs = np.where(b['paint'], box(v) / np.maximum(box(m), 1), b['hsv'][..., 2])
        r = (0.5 * vs + 0.5 * b['hsv'][..., 2]) / base_v
        b['step'] = np.select([r > 1.36, r > 1.18, r > 1.03, r > 0.88, r > 0.74, r > 0.6], [0, 1, 2, 3, 4, 5], 6)

    # ---- landmarks per build (in its own scaled pixels)
    for b in builds:
        a = b['a']; ys, xs = np.where(a)
        b['roof'] = int(ys.min())
        mid = int(round((b['wheelR'][0] + b['wheelF'][0]) / 2))
        col = np.where(a[:, mid])[0]; b['rocker'] = int(col.max()) - 3
        h = b['hsv']
        glass = (h[..., 0] > 0.5) & (h[..., 0] < 0.72) & (h[..., 1] > 0.08) & a & ~b['paint']
        gy = np.where(glass[:, mid - 10:mid + 10].any(axis=1))[0]
        b['belt'] = int(gy.max()) + 1 if len(gy) else int(b['roof'] + 0.45 * (b['ground'] - b['roof']))
        lampm = (h[..., 0] > 0.02) & (h[..., 0] < 0.14) & (h[..., 1] > 0.45) & (h[..., 2] > 0.55) & a
        W = a.shape[1]
        def lamp(x0, x1, fallback):
            yy, xx = np.where(lampm[:, x0:x1])
            return [int(xx.mean()) + x0, int(yy.mean())] if len(xx) > 3 else fallback
        h0 = int(b['roof'] + 0.45 * (b['ground'] - b['roof']))
        b['tail'] = lamp(0, int(W * 0.12), [3, h0])
        b['head'] = lamp(int(W * 0.88), W, [W - 4, h0 + 4])
        b['exhaust'] = [6, int(b['rocker'])]

    # ---- wings: what a modified build carries above its rear deck that the
    # stock car doesn't (outside the stock outline, or dark parts over the
    # stock's paint and glass: uprights), cut off into overlays placed
    # relative to the roof and the rear wheel
    s = builds[0]
    # the stock outline grown by 3 px: a build's own small differences in
    # shape along the hatch are not a wing
    grown = s['a'].copy()
    for _ in range(3):
        g_ = grown.copy(); g_[1:] |= grown[:-1]; g_[:-1] |= grown[1:]; g_[:, 1:] |= grown[:, :-1]; g_[:, :-1] |= grown[:, 1:]; grown = g_
    wings = []
    for bi, b in enumerate(builds[1:], 1):
        b['name'] = NAMES[bi]
        dx = s['wheelR'][0] - b['wheelR'][0]; dy = s['roof'] - b['roof']
        H, W = b['a'].shape
        reg_x = b['wheelR'][0] + 0.25 * (b['wheelF'][0] - b['wheelR'][0])
        reg_y = b['roof'] + 0.5 * (b['belt'] - b['roof']) + 0.3 * (b['rocker'] - b['belt'])
        over = []
        for y in range(H):
            if y > reg_y: break
            for x in range(W):
                if not b['a'][y, x] or x > reg_x: continue
                sx, sy = int(round(x + dx)), int(round(y + dy))
                inside = 0 <= sx < s['a'].shape[1] and 0 <= sy < s['a'].shape[0] and grown[sy, sx]
                dark = b['hsv'][y, x, 2] < 0.3 and b['hsv'][y, x, 1] < 0.35
                core = inside and s['a'][sy, sx]
                if not inside or (core and dark and not (s['hsv'][sy, sx, 2] < 0.3 and s['hsv'][sy, sx, 1] < 0.35)):
                    over.append((x, y))
        # only a real wing (a few dozen pixels), not edge noise
        if len(over) < 30: over = []
        for (x, y) in over:
            b.setdefault('wingpx', []).append((x, y, b['rgb'][y, x].copy(), bool(b['paint'][y, x]), int(b['step'][y, x])))
            b['a'][y, x] = False
            sx, sy = int(round(x + dx)), int(round(y + dy))
            # under an upright that crossed the stock body, put the stock pixel back
            if 0 <= sx < s['a'].shape[1] and 0 <= sy < s['a'].shape[0] and s['a'][sy, sx]:
                b['a'][y, x] = True; b['rgb'][y, x] = s['rgb'][sy, sx]; b['paint'][y, x] = s['paint'][sy, sx]; b['step'][y, x] = s['step'][sy, sx]
        wings.append(b)
    # ---- palette: paint steps plus the other colours quantised together
    others = np.concatenate([b['rgb'][b['a'] & ~b['paint']] for b in builds] + [np.array([[0, 0, 0]])])
    q = Image.fromarray(others.astype(np.uint8).reshape(-1, 1, 3)).quantize(colors=min(160, len(others)), method=Image.MEDIANCUT, dither=Image.NONE)
    qpal = np.array(q.getpalette()[:3 * 160]).reshape(-1, 3)
    def nearest(c):
        return int(np.argmin(((qpal - c) ** 2).sum(axis=1)))
    cache = {}
    def code(c):
        k = tuple(int(v) for v in c)
        if k not in cache: cache[k] = '%02x%02x%02x' % tuple(int(v) for v in qpal[nearest(np.array(k))])
        return cache[k]

    # ---- atlas: the builds stacked, 2 px apart
    AW = max(b['a'].shape[1] for b in builds); AH = sum(b['a'].shape[0] + 2 for b in builds)
    atlas = [[None] * AW for _ in range(AH)]
    oy = 0; meta = []
    for i, b in enumerate(builds):
        H, W = b['a'].shape
        for y in range(H):
            for x in range(W):
                if b['a'][y, x]:
                    atlas[oy + y][x] = ('p%d' % b['step'][y, x]) if b['paint'][y, x] else code(b['rgb'][y, x])
        def P(v): return [round(v[0], 1), round(v[1] + oy, 1)] + ([round(v[2], 2)] if len(v) > 2 else [])
        meta.append({'rect': [0, oy, W - 1, oy + H - 1], 'ground': oy + b['ground'] - 1,
                     'wheelR': P(b['wheelR']), 'wheelF': P(b['wheelF']), 'roof': oy + b['roof'],
                     'belt': oy + b['belt'], 'rocker': oy + b['rocker'],
                     'tail': P(b['tail']), 'head': P(b['head']), 'exhaust': P(b['exhaust']), 'livery': i == 3})
        b['oy'] = oy
        oy += H + 2
    wing_lists = []
    for b in wings:
        lst = []
        for (x, y, col, paint, st) in b.get('wingpx', []):
            cd = ('p%d' % st) if paint else code(col)
            lst.append([int(x - round(b['wheelR'][0])), int(y - b['roof']), cd])
        wing_lists.append(lst)
        print('wing', b['name'], len(lst), 'px')

    # ---- encode: palette (hex, or p0..p6 for paint), runs of [index (2 chars), run - 1 (1 char)]
    pal = ['']; idx = {'': 0}
    toks = []
    flat = [c or '' for row in atlas for c in row]
    i = 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j] == flat[i] and j - i < 64: j += 1
        c = flat[i]
        if c not in idx: idx[c] = len(pal); pal.append(c)
        n = idx[c]; toks.append(B64[n >> 6] + B64[n & 63] + B64[j - i - 1]); i = j
    js = ('// %s sprite sheet: four builds (stock, street, widebody, race), made by\n'
          '// tools/carsheet.py from tools/carsheets/%s.png. Paint is p0..p6 (the\n'
          '// paint ramp); runs are [palette index: 2 chars, run - 1: 1 char], base 64.\n'
          'DR.SHEETS = DR.SHEETS || {};\n'
          'DR.SHEETS.%s = { w: %d, h: %d, enc: 3, pal: %s,\n  rle: \'%s\' };\n'
          'DR.BITMAP_CARS = DR.BITMAP_CARS || {};\n'
          'DR.BITMAP_CARS.%s = { sheet: \'%s\', dens: %d,\n  builds: %s,\n  wings: %s };\n') % (
        cfg['id'], cfg['id'], cfg['id'], AW, AH, json.dumps(pal), ''.join(toks),
        cfg['carId'], cfg['id'], DENS, json.dumps(meta), json.dumps(wing_lists, separators=(',', ':')))
    out = os.path.join(os.path.dirname(__file__), '..', 'www', 'js', 'sheet_%s.js' % cfg['id'])
    open(out, 'w').write(js)
    print('wrote', os.path.normpath(out), len(js) // 1024, 'KB,', len(pal), 'colours')

    if prev_dir:
        s = 3
        img2 = Image.new('RGB', (AW * s, AH * s), (255, 0, 255)); d = ImageDraw.Draw(img2)
        for y in range(AH):
            for x in range(AW):
                c = atlas[y][x]
                if not c: continue
                col = (60 + 30 * (6 - int(c[1])), 30, 40) if c[0] == 'p' else tuple(int(c[k:k + 2], 16) for k in (0, 2, 4))
                d.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1], fill=col)
        for m in meta:
            for w in (m['wheelR'], m['wheelF']):
                d.ellipse([(w[0] - w[2]) * s, (w[1] - w[2]) * s, (w[0] + w[2]) * s, (w[1] + w[2]) * s], outline=(0, 255, 0))
            d.line([(0, m['ground'] * s), (AW * s, m['ground'] * s)], fill=(0, 255, 255))
            d.line([(0, m['belt'] * s), (AW * s, m['belt'] * s)], fill=(255, 255, 0))
        img2.save(os.path.join(prev_dir, 'atlas_%s.png' % cfg['id']))


if __name__ == '__main__':
    cfg = json.load(open(sys.argv[1]))
    if sys.argv[2] == 'build': build(cfg, sys.argv[3] if len(sys.argv) > 3 else None)
