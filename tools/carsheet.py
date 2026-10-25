#!/usr/bin/env python3
"""Turn a 4-variant pixel-art car sheet (stock / street / widebody / race,
side views on a dark navy background) into game data (www/js/sheet_<id>.js).

  python3 tools/carsheet.py tools/carsheets/<id>.json preview   # crops + grids to measure wheels
  python3 tools/carsheet.py tools/carsheets/<id>.json build     # writes www/js/sheet_<id>.js

The art is drawn large and soft (not on a pixel grid), so each car is lifted
off the background, scaled to the game's sprite density (2 px per game pixel,
44 px per metre at 1x), its colours cleaned up to a palette, and its body
paint marked as paint-ramp steps (p0..p6) so the player's paint colour can be
applied. Wings above the roof line are cut off each variant as overlays (the
body shop's spoiler slot), aligned to the stock car's greenhouse.
"""
import json, sys, os, colorsys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

DENS = 2            # sheet pixels per game sprite pixel at res 1
PPM = 44

def lum(a): return (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]) / 255

def bg_mask(sub):
    """Background = dark navy (blue cast, green well under blue) or the bright
    blue floor glow, flood-filled from the panel's edges."""
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    L = lum(sub)
    blu = (g * 10 < b * 8)
    cand = (((b - r) >= 8) & (L < 0.12) | (L < 0.05) & ((b - r) >= 4) | ((b - r) > 60) & (L < 0.45)) & blu
    h, w = L.shape
    seen = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and not seen[yy, xx] and cand[yy, xx]:
                seen[yy, xx] = True; q.append((yy, xx))
    return seen

def cut_variants(cfg):
    im = np.asarray(Image.open(cfg['sheet']).convert('RGB')).astype(np.int32)
    out = []
    for name in ('stock', 'street', 'wide', 'race'):
        x0, y0, x1, y1 = cfg['panels'][name]
        sub = im[y0:y1, x0:x1]
        m = ~bg_mask(sub)
        # keep the biggest connected blob (the car), drop specks and glow streaks
        lab = np.zeros(m.shape, np.int32); best = (0, 0); n = 0
        for (sy, sx) in zip(*np.where(m)):
            if lab[sy, sx]: continue
            n += 1; q = deque([(sy, sx)]); lab[sy, sx] = n; cnt = 0
            while q:
                y, x = q.popleft(); cnt += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; q.append((yy, xx))
            if cnt > best[0]: best = (cnt, n)
        m = lab == best[1]
        # nothing below the tires (ground glow)
        if name in cfg.get('groundCut', {}):
            m[cfg['groundCut'][name] - y0:, :] = False
        ys, xs = np.where(m)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        out.append((name, sub[by0:by1, bx0:bx1], m[by0:by1, bx0:bx1]))
    return out

def downsample(rgb, mask, k):
    """Area-average by factor k (k > 1 shrinks); alpha = coverage > 0.5."""
    h, w = mask.shape
    H, W = int(round(h / k)), int(round(w / k))
    col = np.zeros((H, W, 3)); a = np.zeros((H, W))
    for Y in range(H):
        ya, yb = int(Y * k), max(int((Y + 1) * k), int(Y * k) + 1)
        for X in range(W):
            xa, xb = int(X * k), max(int((X + 1) * k), int(X * k) + 1)
            mm = mask[ya:yb, xa:xb]
            if mm.size == 0: continue
            cov = mm.mean(); a[Y, X] = cov
            if cov > 0: col[Y, X] = rgb[ya:yb, xa:xb][mm].mean(axis=0)
    return col, a > 0.5

def scaled(cfg):
    vs = cut_variants(cfg)
    stock_len = vs[0][1].shape[1]
    target = cfg['lenM'] * PPM * DENS * cfg.get('lenScale', 1.0)
    k = stock_len / target
    res = []
    for name, rgb, m in vs:
        c, a = downsample(rgb, m, k)
        res.append((name, c, a))
    return res, k

def preview(cfg, outdir):
    res, k = scaled(cfg)
    print('scale: %.3f sheet px per sprite px' % k)
    for name, c, a in res:
        h, w = a.shape; s = 4
        img = Image.new('RGB', (w * s, h * s), (255, 0, 255)); d = ImageDraw.Draw(img)
        for y in range(h):
            for x in range(w):
                if a[y, x]: d.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1], fill=tuple(int(v) for v in c[y, x]))
        for x in range(0, w, 5): d.line([(x * s, 0), (x * s, h * s)], fill=(0, 200, 255) if x % 10 == 0 else (120, 230, 255))
        for y in range(0, h, 5): d.line([(0, y * s), (w * s, y * s)], fill=(0, 200, 255) if y % 10 == 0 else (120, 230, 255))
        img.save(os.path.join(outdir, '%s_%s.png' % (cfg['id'], name)))
        print(name, 'size', w, h)

if __name__ == '__main__':
    cfg = json.load(open(sys.argv[1]))
    if sys.argv[2] == 'preview': preview(cfg, sys.argv[3] if len(sys.argv) > 3 else '.')
