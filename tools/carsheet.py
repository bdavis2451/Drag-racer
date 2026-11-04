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
  windows   (optional) [[[x0, y0, x1, y1], [seed x, y], ...], ...]: windows whose
            insides keep the art's colours (seats, reflections) instead of
            being keyed as paint; frameV: how dark the window frame is
  paintAreas (optional) [[outline, maxV], ...]: grey highlights inside the
            outline, up to maxV bright, made paint (a dark car's roof sheen)
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


def wheels(crop, lift=1):
    """[rear, front] wheel circles (cx, cy, r) from the tire footprints: the
    lowest pixel of each column right around a contact patch can only be
    tire, and a circle through those points is the tire."""
    a = crop[..., 3] > 127
    ys, xs = np.where(a); ground = ys.max()
    low = {}
    for x in range(a.shape[1]):
        col = np.where(a[:, x])[0]
        if len(col): low[x] = col.max()
    cols = [x for x, v in low.items() if v >= ground - lift]
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
        # better, as a template (a flat-bottomed tire, or the body's outline
        # running into it at the ground, fits a circle too big from the
        # bottom edge): circles standing on the ground, scored on their lower
        # half for a dark tire ring with a light rim inside it
        Lm = rgb.mean(axis=2) / 255
        dark = a & (Lm < 0.3); lit = a & (Lm > 0.42)
        ang = np.linspace(np.radians(195), np.radians(345), 40)
        best_ = (0, None)
        for cxx in np.arange(cx - 4, cx + 4.5, 1.0):
            for rr, dy in [(rr_, dy_) for rr_ in np.arange((0.03 if lift > 1 else 0.07) * wb, 0.2 * wb, 0.5) for dy_ in range(lift + 1)]:
                cyy = ground + 1 - rr - dy
                def frac(m, f0, f1):
                    n = k = 0
                    for f in np.linspace(f0, f1, 4):
                        xs_ = (cxx + np.cos(ang) * rr * f).astype(int); ys_ = (cyy - np.sin(ang) * rr * f).astype(int)
                        ok = (xs_ >= 0) & (xs_ < a.shape[1]) & (ys_ >= 0) & (ys_ < a.shape[0])
                        n += len(xs_); k += m[ys_[ok], xs_[ok]].sum()
                    return k / n
                sc = frac(dark, 0.8, 0.97) * frac(lit, 0.2, 0.62) * (1 - frac(dark, 1.12, 1.25) * 0.5)
                if sc > best_[0]: best_ = (sc, (cxx, cyy, rr))
        if best_[1] and best_[0] > 0.1: cx, cy, r = best_[1]
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
    if 'neutral' in p:
        lo, hi = p['neutral']
        return (s <= p.get('maxSat', 0.18)) & (v >= lo) & (v <= hi)
    lo, hi = p['hue']
    inh = (h >= lo) | (h <= hi) if lo > hi else (h >= lo) & (h <= hi)
    return inh & (s >= p.get('minSat', 0.45)) & (v >= p.get('minVal', 0.18))


def build(cfg, prev_dir=None, crops=None):
    if crops is None:
        crops = cut_builds(np.asarray(Image.open(cfg['sheet']).convert('RGBA')))
    info = [wheels(c, cfg.get('lift', 1)) for c in crops]
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
        if i:
            # same tires on every build: one radius per build, no bigger than the
            # stock's (a fit through a flared arch or a lip reads large), sat on
            # the ground line
            sr = (builds[0]['wheelR'][2] + builds[0]['wheelF'][2]) / 2
            r_ = min((wr[2] + wf[2]) * f / 2, sr * 1.03)
            for w_ in (builds[-1]['wheelR'], builds[-1]['wheelF']):
                w_[2] = r_; w_[1] = min(w_[1], builds[-1]['ground'] - r_)
        if len(crops) == 1 and cfg.get('sameWheels', True):
            # one stock car: the same tires front and rear; a fit that takes
            # in the arch reads large, so the smaller one
            r_ = min(builds[-1]['wheelR'][2], builds[-1]['wheelF'][2])
            for w_ in (builds[-1]['wheelR'], builds[-1]['wheelF']):
                w_[2] = r_; w_[1] = builds[-1]['ground'] - r_
        print('%-6s sheet wheelbase %.1f  scale %.3f  size %dx%d  wheels r %.1f / %.1f' % (NAMES[i], wb[i], f, a.shape[1], a.shape[0], builds[-1]['wheelR'][2], builds[-1]['wheelF'][2]))

    # ---- paint: body-colour pixels become ramp steps by brightness, judged
    # against the stock car's paint (so every build shades the same)
    for b in builds:
        b['hsv'] = hsv(b['rgb']); b['paint'] = is_paint(b['hsv'], cfg['paint']) & b['a']
        yy, xx = np.mgrid[0:b['a'].shape[0], 0:b['a'].shape[1]]
        for w_ in (b['wheelR'], b['wheelF']):
            b['paint'] &= (xx + 0.5 - w_[0]) ** 2 + (yy + 0.5 - w_[1]) ** 2 > (w_[2] * 0.9) ** 2
    pc = cfg['paint']
    loose = dict(pc)
    if 'neutral' in pc:
        loose['neutral'] = [max(0.0, pc['neutral'][0] - 0.1), min(1.0, pc['neutral'][1] + 0.12)]; loose['maxSat'] = pc.get('maxSat', 0.18) * 1.6
    else:
        loose['minSat'] = pc.get('minSat', 0.45) * 0.5; loose['minVal'] = 0.08
    for b in builds:
        cand = is_paint(b['hsv'], loose) & b['a'] & ~b['paint']
        yy, xx = np.mgrid[0:b['a'].shape[0], 0:b['a'].shape[1]]
        for w_ in (b['wheelR'], b['wheelF']):
            cand &= (xx + 0.5 - w_[0]) ** 2 + (yy + 0.5 - w_[1]) ** 2 > (w_[2] * 0.9) ** 2
        for _ in range(cfg.get('edgePasses', 3)):
            P = b['paint']; nb = np.zeros_like(P)
            nb[1:] |= P[:-1]; nb[:-1] |= P[1:]; nb[:, 1:] |= P[:, :-1]; nb[:, :-1] |= P[:, 1:]
            add = cand & nb
            if not add.any(): break
            b['paint'] = P | add; cand &= ~add
    # ---- windows: a seat, a headrest or a reflection behind the glass in the
    # paint's own tone (a grey, white or black car) would be keyed as paint
    # and take the body colour in game. "windows" (stock car, sheet pixels):
    # [[box x0, y0, x1, y1], [seed x, y], ...]: each window is flood-filled
    # from its seeds up to its dark frame (darker than "frameV"), inside the
    # box, and nothing in it is paint: it keeps the art's own colours.
    b0 = builds[0]; b0['win'] = np.zeros_like(b0['a'])
    fv = cfg.get('frameV', 0.16)
    for win in cfg.get('windows', []):
        clip, seeds = win[0], win[1:]
        if len(clip) == 4 and not isinstance(clip[0], list): clip = [[clip[0], clip[1]], [clip[2], clip[1]], [clip[2], clip[3]], [clip[0], clip[3]]]
        cm = Image.new('L', (b0['a'].shape[1], b0['a'].shape[0]), 0); ImageDraw.Draw(cm).polygon([tuple(q) for q in clip], fill=255, outline=255)
        inside = np.asarray(cm) > 0
        xs_ = [q[0] for q in clip]; ys_ = [q[1] for q in clip]; x0, y0, x1, y1 = min(xs_), min(ys_), max(xs_), max(ys_)
        open_ = (b0['hsv'][..., 2] >= fv) & b0['a'] & inside
        q = deque()
        for sx, sy in seeds:
            if open_[sy, sx] and not b0['win'][sy, sx]: b0['win'][sy, sx] = True; q.append((sy, sx))
        while q:
            y, x = q.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if y0 <= ny <= y1 and x0 <= nx <= x1 and open_[ny, nx] and not b0['win'][ny, nx]:
                    b0['win'][ny, nx] = True; q.append((ny, nx))
    # "paintAreas": [[outline, maxV], ...]: the other way round: highlights on
    # the body (a roof's sheen on a dark car) too bright for the paint key,
    # left grey on any colour. Grey pixels inside, up to maxV bright, become
    # paint (the brightest steps of the ramp).
    # (with a third entry 'any': every colour inside, a stray blob in the art)
    for pa in cfg.get('paintAreas', []):
        poly, maxv, anyc = pa[0], pa[1], len(pa) > 2 and pa[2] == 'any'
        cm = Image.new('L', (b0['a'].shape[1], b0['a'].shape[0]), 0); ImageDraw.Draw(cm).polygon([tuple(q) for q in poly], fill=255, outline=255)
        hv = b0['hsv']; add = (np.asarray(cm) > 0) & b0['a'] & ((hv[..., 1] < 0.3) | anyc) & (hv[..., 2] >= 0.12) & (hv[..., 2] <= maxv) & ~b0['win'] & ~b0['paint']
        print('paint area: %d px added' % add.sum())
        b0['paint'] |= add
    if cfg.get('despeck'):
        # "despeck": a lone grey pixel with paint all round (a stray highlight
        # dot) becomes paint
        # (or a pair of them: paint on three sides each)
        hv = b0['hsv']; tot = 0
        for _ in range(2):
            P = b0['paint']; nb = np.zeros(P.shape, int)
            nb[1:] += P[:-1]; nb[:-1] += P[1:]; nb[:, 1:] += P[:, :-1]; nb[:, :-1] += P[:, 1:]
            add = (nb >= 3) & ~P & b0['a'] & (hv[..., 1] < 0.3) & ~b0['win']
            tot += add.sum(); b0['paint'] = P | add
        print('despeck: %d px' % tot)
    if cfg.get('windows'):
        print('windows: %d px, %d of them were paint' % (b0['win'].sum(), (b0['win'] & b0['paint']).sum()))
        b0['paint'] &= ~b0['win']
        if prev_dir:
            s_ = 5; H_, W_ = b0['a'].shape
            im = Image.new('RGB', (W_ * s_, H_ * s_), (70, 70, 85)); d_ = ImageDraw.Draw(im)
            for y in range(H_):
                for x in range(W_):
                    if not b0['a'][y, x]: continue
                    c_ = tuple(int(v_) for v_ in b0['rgb'][y, x])
                    if b0['win'][y, x]: c_ = (min(255, c_[0] // 2 + 128), c_[1] // 2, min(255, c_[2] // 2 + 128))
                    d_.rectangle([x * s_, y * s_, x * s_ + s_ - 1, y * s_ + s_ - 1], fill=c_)
            for gx in range(0, W_, 5): d_.line([gx * s_, 0, gx * s_, H_ * s_], fill=(110, 110, 50) if gx % 10 else (200, 200, 0))
            for gy in range(0, H_, 5): d_.line([0, gy * s_, W_ * s_, gy * s_], fill=(110, 110, 50) if gy % 10 else (200, 200, 0))
            for gx in range(0, W_, 10): d_.text((gx * s_ + 2, 2), str(gx), fill=(255, 255, 0))
            for gy in range(10, H_, 10): d_.text((2, gy * s_ + 1), str(gy), fill=(255, 255, 0))
            for win in cfg['windows']:
                clip = win[0]
                if len(clip) == 4 and not isinstance(clip[0], list): clip = [[clip[0], clip[1]], [clip[2], clip[1]], [clip[2], clip[3]], [clip[0], clip[3]]]
                d_.polygon([(q[0] * s_, q[1] * s_) for q in clip], outline=(0, 255, 255))
            im.save(os.path.join(prev_dir, 'win_%s.png' % cfg['id']))
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
        if base_v < 0.3:
            v2 = 0.9 * vs + 0.1 * b['hsv'][..., 2]
            q = np.percentile(v2[b['paint']], [97, 90, 72, 30, 12, 4])
            b['step'] = np.select([v2 > q[0], v2 > q[1], v2 > q[2], v2 > q[3], v2 > q[4], v2 > q[5]], [0, 1, 2, 3, 4, 5], 6)

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
                # dark or grey (mounts, uprights) over the stock's paint
                dark = (b['hsv'][y, x, 2] < 0.3 and b['hsv'][y, x, 1] < 0.35) or (b['hsv'][y, x, 1] < 0.2 and not b['paint'][y, x])
                core = inside and s['a'][sy, sx]
                if not inside or (core and dark and s['paint'][sy, sx]):
                    over.append((x, y))
        # only a real wing (a few dozen pixels), not edge noise
        if len(over) < 30: over = []
        # the wing's stubs and lips that sit in the 3 px margin: anything joined
        # to the wing there that the stock outline itself doesn't cover
        seen = set(over); stack = list(over)
        while stack:
            x, y = stack.pop()
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) in seen or not (0 <= nx < W and 0 <= ny < H) or ny > reg_y or nx > reg_x or not b['a'][ny, nx]: continue
                sx, sy = int(round(nx + dx)), int(round(ny + dy))
                if 0 <= sx < s['a'].shape[1] and 0 <= sy < s['a'].shape[0] and s['a'][sy, sx]: continue
                seen.add((nx, ny)); over.append((nx, ny)); stack.append((nx, ny))
        hole = []
        for (x, y) in over:
            b.setdefault('wingpx', []).append((x, y, b['rgb'][y, x].copy(), bool(b['paint'][y, x]), int(b['step'][y, x])))
            b['a'][y, x] = False
            sx, sy = int(round(x + dx)), int(round(y + dy))
            if 0 <= sx < s['a'].shape[1] and 0 <= sy < s['a'].shape[0] and s['a'][sy, sx]: hole.append((x, y))
        # under an upright that crossed the body, fill in from the build's own
        # neighbouring body pixels (the stock's pixels there don't line up)
        hole = set(hole)
        while hole:
            done = []
            for (x, y) in hole:
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < W and 0 <= ny < H and b['a'][ny, nx] and (nx, ny) not in hole:
                        done.append((x, y, nx, ny)); break
            if not done: break
            for (x, y, nx, ny) in done:
                b['a'][y, x] = True; b['rgb'][y, x] = b['rgb'][ny, nx]; b['paint'][y, x] = b['paint'][ny, nx]; b['step'][y, x] = b['step'][ny, nx]
                hole.discard((x, y))
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
    js = ('// %s sprite sheet: ' + ('four builds (stock, street, widebody, race)' if len(builds) == 4 else 'the stock car (body kits drawn on in game)') + ', made by\n'
          '// tools/carsheet.py from tools/carsheets/%s. Paint is p0..p6 (the\n'
          '// paint ramp); runs are [palette index: 2 chars, run - 1: 1 char], base 64.\n'
          'DR.SHEETS = DR.SHEETS || {};\n'
          'DR.SHEETS.%s = { w: %d, h: %d, enc: 3, pal: %s,\n  rle: \'%s\' };\n'
          'DR.BITMAP_CARS = DR.BITMAP_CARS || {};\n'
          'DR.BITMAP_CARS.%s = { sheet: \'%s\', dens: %d,\n  builds: %s,\n  wings: %s };\n') % (
        cfg['id'], cfg.get('src', cfg['id'] + '.png'), cfg['id'], AW, AH, json.dumps(pal), ''.join(toks),
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


def cut_grid(img, n):
    """A sheet of stock cars in rows (left to right, top to bottom): each car
    as an RGBA crop, with any part of it that floats free (a wing) kept."""
    a = img[..., 3] > 127
    comps = components(a, 150)
    big = [c for c in comps if len(c) >= 3000]
    assert len(big) >= n, 'found %d cars, expected %d' % (len(big), n)
    big = big[:n]
    boxes = []
    for c in big:
        ys, xs = zip(*c); boxes.append([min(xs), min(ys), max(xs), max(ys), list(c)])
    for c in comps:
        if len(c) >= 3000: continue
        ys, xs = zip(*c); cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        for b in boxes:
            if b[0] - 25 <= cx <= b[2] + 25 and b[1] - 25 <= cy <= b[3] + 25:
                b[4].extend(c); b[0] = min(b[0], min(xs)); b[1] = min(b[1], min(ys)); b[2] = max(b[2], max(xs)); b[3] = max(b[3], max(ys)); break
    # rows: by the cars' vertical centres, split where there's a gap
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows = [[boxes[0]]]
    for b in boxes[1:]:
        if (b[1] + b[3]) / 2 - (rows[-1][-1][1] + rows[-1][-1][3]) / 2 > 60: rows.append([b])
        else: rows[-1].append(b)
    out = []
    for r in rows:
        for b in sorted(r, key=lambda b: b[0]):
            x0, y0, x1, y1, pts = b
            crop = np.zeros((y1 - y0 + 1, x1 - x0 + 1, 4), np.uint8)
            ys, xs = np.array([q[0] for q in pts]), np.array([q[1] for q in pts])
            crop[ys - y0, xs - x0] = img[ys, xs]
            out.append(crop)
    return out


def keyed(img, key):
    """A sheet on a solid colour (magenta): that colour, and the fringe
    blended into it, become transparent."""
    out = img.copy(); c = img[..., :3].astype(int)
    if key == 'magenta':
        m = np.minimum(c[..., 0], c[..., 2]) - c[..., 1] > 70
        # only the background itself: magenta joined to the sheet's edge (a
        # purple window inside a car stays)
        mi = Image.fromarray(np.where(m, 255, 0).astype(np.uint8)).copy()
        for x, y in ((0, 0), (mi.width - 1, 0), (0, mi.height - 1), (mi.width - 1, mi.height - 1)):
            if mi.getpixel((x, y)) == 255: ImageDraw.floodfill(mi, (x, y), 128)
        bgm = np.asarray(mi) == 128
        # and the fringe: magenta-ish pixels touching the background
        grow = bgm.copy(); grow[1:] |= bgm[:-1]; grow[:-1] |= bgm[1:]; grow[:, 1:] |= bgm[:, :-1]; grow[:, :-1] |= bgm[:, 1:]
        fringe = grow & (np.minimum(c[..., 0], c[..., 2]) - c[..., 1] > 40)
        mm = np.minimum(c[..., 0], c[..., 2]) - c[..., 1]
        pocket = mm > 110                                               # magenta seen through a gap (a purple window stays under ~100)
        pg = pocket.copy(); pg[1:] |= pocket[:-1]; pg[:-1] |= pocket[1:]; pg[:, 1:] |= pocket[:, :-1]; pg[:, :-1] |= pocket[:, 1:]
        pocket |= pg & (mm > 60)
        out[..., 3] = np.where(bgm | fringe | pocket, 0, 255).astype(np.uint8)
    return out


def grid(cfg, prev_dir=None):
    img = np.asarray(Image.open(cfg['sheet']).convert('RGBA'))
    if cfg.get('key'): img = keyed(img, cfg['key'])
    crops = cut_grid(img, cfg['count'])
    for car in cfg['cars']:
        c = dict(car); c.setdefault('carId', c['id']); c['src'] = os.path.basename(cfg['sheet'])
        print('== #%d %s' % (car['slot'], car['id']))
        build(c, prev_dir, [crops[car['slot'] - 1]])


if __name__ == '__main__':
    cfg = json.load(open(sys.argv[1]))
    if sys.argv[2] == 'build': build(cfg, sys.argv[3] if len(sys.argv) > 3 else None)
    if sys.argv[2] == 'grid': grid(cfg, sys.argv[3] if len(sys.argv) > 3 else None)
