"""Generates the Android launcher icons and splash screens as pixel art.
Run from the repo root:  python3 tools/make_icons.py"""
import os
from PIL import Image, ImageDraw

RES = 'android/app/src/main/res'
BG = (22, 23, 28)

# 32x32 pixel car (same design as www/icon.svg)
RECTS = [
    ((0, 24, 32, 8), (58, 58, 64)),
    ((4, 15, 24, 6), (227, 27, 109)),
    ((10, 11, 11, 5), (227, 27, 109)),
    ((12, 12, 7, 3), (28, 40, 58)),
    ((2, 10, 5, 2), (34, 34, 34)),
    ((3, 12, 1, 4), (34, 34, 34)),
    ((4, 19, 7, 7), (17, 17, 17)),
    ((6, 21, 3, 3), (204, 204, 204)),
    ((22, 21, 5, 5), (17, 17, 17)),
    ((23, 22, 3, 3), (204, 204, 204)),
    ((26, 16, 2, 1), (255, 233, 160)),
]

GLYPH = {
    'P': '110101110100100', 'I': '111010010010111', 'X': '101101010101101', 'E': '111100110100111',
    'L': '100100100100111', 'D': '110101101101110', 'R': '110101110101101', 'A': '010101111101101',
    'G': '011100101101011', ' ': '000000000000000',
}


def car(size=32, bg=BG, road=True):
    im = Image.new('RGBA', (size, size), bg)
    d = ImageDraw.Draw(im)
    for (x, y, w, h), c in RECTS:
        if not road and c == (58, 58, 64):
            continue
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)
    return im


def text(d, s, x, y, scale, color):
    for ch in s:
        g = GLYPH[ch]
        for i, bit in enumerate(g):
            if bit == '1':
                px, py = x + (i % 3) * scale, y + (i // 3) * scale
                d.rectangle([px, py, px + scale - 1, py + scale - 1], fill=color)
        x += 4 * scale


def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)


icon = car()
for dpi, px in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    big = icon.resize((px, px), Image.NEAREST)
    save(big, f'{RES}/mipmap-{dpi}/ic_launcher.png')
    mask = Image.new('L', (px, px), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, px - 1, px - 1], fill=255)
    rnd = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    rnd.paste(big, (0, 0), mask)
    save(rnd, f'{RES}/mipmap-{dpi}/ic_launcher_round.png')

# adaptive icon foreground: 108dp canvas, art kept inside the 66dp safe zone
fg_small = Image.new('RGBA', (54, 54), (0, 0, 0, 0))
fg_small.paste(car(32, (0, 0, 0, 0), road=False), (11, 9))
for dpi, px in [('mdpi', 108), ('hdpi', 162), ('xhdpi', 216), ('xxhdpi', 324), ('xxxhdpi', 432)]:
    save(fg_small.resize((px, px), Image.NEAREST), f'{RES}/mipmap-{dpi}/ic_launcher_foreground.png')
with open(f'{RES}/values/ic_launcher_background.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#16171C</color>\n</resources>\n')

# splash screens
def splash(w, h):
    base = 1
    while 60 * (base + 1) <= min(w, h) * 0.5:
        base += 1
    im = Image.new('RGB', (w, h), BG)
    c = car(32, BG).resize((32 * base, 32 * base), Image.NEAREST)
    im.paste(c, ((w - c.width) // 2, h // 2 - c.height + base * 4))
    d = ImageDraw.Draw(im)
    s = max(2, base // 2 + 1)
    label = 'PIXEL DRAG'
    tw = len(label) * 4 * s - s
    text(d, label, (w - tw) // 2, h // 2 + base * 6, s, (255, 204, 0))
    return im


for f in ['drawable/splash.png'] + [f'drawable-{o}-{d}/splash.png' for o in ('land', 'port') for d in ('mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi')]:
    path = f'{RES}/{f}'
    w, h = Image.open(path).size
    save(splash(w, h), path)
print('icons and splash screens written')
