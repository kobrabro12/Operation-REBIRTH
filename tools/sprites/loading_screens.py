"""LOADING SCREENS (Fortnite-style): for each screen a vivid pixel-art backdrop and a big hero cut out of the
fighter's own sheets in an action pose. The page (index.html + public/loading-screens.js) stacks them into a living
screen - the backdrop slowly pushing in, light rays turning behind the hero, the hero sliding in and floating with a
glow, the screen's own particles, its name and tips, and a slanted progress bar.

Writes public/assets/ui/loading/<id>_bg.png (BG_W x BG_H, shown pixelated, full screen) and <id>_hero.png (the
trimmed pose with a dark outline; CSS scales it). Every file stays a palette PNG (few colours, dithered bands).
Run:  python3 tools/sprites/loading_screens.py [--preview FILE]
"""
import os, re, json, math, sys, random
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '../..')
OUT = os.path.join(ROOT, 'public/assets/ui/loading')
FIGHTERS = os.path.join(ROOT, 'public/assets/fighters')
BG_W, BG_H = 320, 180                                  # backdrop size (16:9; the page shows it at 4-6x, pixelated)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0

# which frame of which moves sheet each hero is cut from: (fighter folder, frame w, h, moves table, frame index)
POSES = {
    'soul-summoner': ('soul-summoner', 112, 104, 777),     # TAUNT: soul fire held up high
    'mr-wake': ('mr-wake', 176, 120, 585),                 # TAUNT: the staff held up
    'hero-knight': ('hero-knight', 180, 140, 192),         # TAUNT: the sword raised to the sky
    'nu': ('nu', 112, 104, 167),                           # FSMASH: the flying kick
    'aero': ('aero', 112, 104, 489),                       # FSMASH: the dashing punch
    'gnash': ('gnash', 180, 168, 101),                     # USMASH: the axe overhead
    'lumen': ('lumen', 112, 104, 799),                     # TAUNT: low, the staff thrust out with a star on its tip
    'vanta': ('vanta', 112, 104, 608),                     # IAI CUT: both blades out of the draw
    'kami': ('kami', 112, 104, 809),                       # TAUNT: the fan flung up high
    'vitrail': ('vitrail', 112, 104, 718),                 # THE ROSE OF SEVEN HOURS: both arms up to the sky
}


def hexc(h):
    """'#rrggbb' -> (r, g, b)."""
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def bands(stops, w=BG_W, h=BG_H, y0=0, y1=None):
    """A sky of flat colour bands from top to bottom through `stops` [(0..1, '#hex'), ...], each step between two
    bands blended with the 4x4 ordered dither (the 16-bit look). Returns an RGB numpy array."""
    y1 = h if y1 is None else y1
    img = np.zeros((h, w, 3), np.uint8)
    cols = [(p, np.array(hexc(c))) for p, c in stops]
    for y in range(h):
        u = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        for i in range(len(cols) - 1):
            if cols[i][0] <= u <= cols[i + 1][0]: break
        a, b = cols[i], cols[i + 1]; k = (u - a[0]) / max(1e-6, b[0] - a[0])
        steps = 4; kq = k * steps
        for x in range(w):
            q = math.floor(kq + BAYER[y % 4, x % 4] - 0.5 + 0.5)
            q = min(steps, max(0, q)) / steps
            img[y, x] = (a[1] * (1 - q) + b[1] * q).astype(np.uint8)
    return img


def dither_blend(img, mask, color, k):
    """Paints `color` over the pixels in `mask` with ordered-dither coverage k (0..1, scalar or per pixel)."""
    h, w = mask.shape
    th = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    kk = k if np.ndim(k) else np.full((h, w), k)
    on = mask & (th < kk)
    img[on] = hexc(color)


def rays(img, cx, cy, n, color, k, spin=0.0):
    """Wedges of light fanning out from (cx, cy): every other wedge lit with dither coverage k, fading with distance."""
    h, w = img.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    a = (np.arctan2(yy - cy, xx - cx) + spin) % (2 * math.pi)
    lit = (np.floor(a / (2 * math.pi) * n * 2) % 2) == 0
    d = np.hypot(xx - cx, yy - cy)
    dither_blend(img, lit, color, k * np.clip(1 - d / (w * 0.8), 0, 1))


def glow(img, cx, cy, r, color, k=0.8):
    """A soft round glow at (cx, cy), radius r, dithered (densest in the middle)."""
    h, w = img.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - cx, yy - cy) / r
    dither_blend(img, d < 1, color, k * np.clip(1 - d, 0, 1) ** 1.3)


def to_im(arr):
    """numpy RGB -> PIL image (RGBA)."""
    return Image.fromarray(arr).convert('RGBA')


def poly(d, pts, c):
    """A filled polygon in a hex colour."""
    d.polygon([(int(x), int(y)) for x, y in pts], fill=hexc(c))


def cloud(d, x, y, w, c, hi):
    """A chunky stacked cloud (a few rounded blobs) with a lighter top edge."""
    for i, (dx, dy, r) in enumerate([(0, 6, 0.3), (0.22, 0, 0.36), (0.5, 3, 0.3), (0.72, 7, 0.24)]):
        R = w * r / 2
        d.ellipse((x + dx * w - R * 0.2, y + dy + 4, x + dx * w + R * 1.8, y + dy + 4 + R * 1.2), fill=hexc(hi))
        d.ellipse((x + dx * w - R * 0.2, y + dy + 6, x + dx * w + R * 1.8, y + dy + 6 + R * 1.2), fill=hexc(c))


def stars(d, n, color, seed, ymax=110):
    """A scatter of 1 px stars (a few brighter crosses)."""
    r = random.Random(seed)
    for i in range(n):
        x, y = r.randrange(BG_W), r.randrange(ymax)
        d.point((x, y), fill=hexc(color))
        if i % 9 == 0: d.point((x - 1, y), fill=hexc(color)); d.point((x + 1, y), fill=hexc(color)); d.point((x, y - 1), fill=hexc(color)); d.point((x, y + 1), fill=hexc(color))


# ---------------------------------------------------------------------------------------------- the backdrops
def bg_soul():
    """THE SKY SANCTUM at golden hour: teal sky into gold, a low sun with rays, floating islands, ruined pillars."""
    a = bands([(0, '#0b1d3a'), (0.35, '#1d5a7a'), (0.62, '#4fa3a0'), (0.8, '#f2c46a'), (1, '#ffe8a8')], y1=150)
    rays(a, 205, 108, 14, '#ffe7a0', 0.35); glow(a, 205, 108, 70, '#fff2c0', 0.7); glow(a, 205, 108, 26, '#ffffff', 0.95)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 40, '#cfe8ff', 3, 50)
    cloud(d, 10, 60, 70, '#e3b56a', '#ffe0a0'); cloud(d, 250, 48, 60, '#d9a35c', '#ffe0a0')
    for x, y, w in [(28, 92, 56), (258, 84, 46), (120, 70, 30)]:                         # floating islands
        poly(d, [(x, y), (x + w, y), (x + w * 0.7, y + 10), (x + w * 0.55, y + 22), (x + w * 0.4, y + 12)], '#163848')
        d.rectangle((x, y - 2, x + w, y), fill=hexc('#3f8a5a'))
    for x in (8, 44, 278, 304):                                                             # broken pillars
        top = 96 + (x % 3) * 8
        d.rectangle((x, top, x + 10, 180), fill=hexc('#10263a')); d.rectangle((x - 2, top, x + 12, top + 3), fill=hexc('#1d4258'))
    poly(d, [(0, 150), (60, 142), (140, 148), (220, 140), (320, 146), (320, 180), (0, 180)], '#0e2232')
    d.rectangle((0, 158, 320, 180), fill=hexc('#0a1724'))
    return im


def bg_wake():
    """GRAVEMOON BRIDGE: violet night, a huge pale moon, the bridge's arches, the black water with the moon in it."""
    a = bands([(0, '#07040f'), (0.4, '#1e0f3d'), (0.75, '#4a1f6a'), (1, '#7a3a8a')], y1=128)
    glow(a, 196, 62, 80, '#6a3aa0', 0.6); rays(a, 196, 62, 10, '#8a5ac0', 0.18)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 70, '#d8c8ff', 7)
    d.ellipse((160, 26, 232, 98), fill=hexc('#efe4ff')); d.ellipse((168, 30, 232, 98), fill=hexc('#ddd0f4'))
    for cx, cy, r in [(186, 52, 6), (204, 70, 9), (214, 46, 4), (180, 80, 5)]: d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=hexc('#c8b8e6'))
    d.rectangle((0, 112, 320, 118), fill=hexc('#120a22'))                                    # the bridge deck
    for x in range(0, 320, 64):
        d.rectangle((x + 26, 118, x + 38, 140), fill=hexc('#120a22'))
        d.arc((x - 6, 108, x + 70, 168), 180, 360, fill=hexc('#120a22'), width=4)
    for x in range(0, 320, 10): d.rectangle((x, 104, x + 2, 112), fill=hexc('#1c1030'))
    d.rectangle((0, 103, 320, 105), fill=hexc('#1c1030'))
    a = np.array(im.convert('RGB')); w = bands([(0, '#1a0c30'), (1, '#06030c')], h=40)
    a[140:180] = w
    im = to_im(a); d = ImageDraw.Draw(im)
    for i in range(10):                                                                     # the moon on the water
        y = 144 + i * 3; ww = 36 - i * 2 + (i % 2) * 6
        d.rectangle((196 - ww // 2, y, 196 + ww // 2, y), fill=hexc('#b8a0e8' if i % 3 else '#efe4ff'))
    return im


def bg_lacy():
    """THE LAST OATH: a burning crimson sunset, the fallen castle's towers and torn banners, the smoke."""
    a = bands([(0, '#14040c'), (0.35, '#4a0c1e'), (0.65, '#a8242a'), (0.85, '#ff6a3a'), (1, '#ffc070')], y1=140)
    rays(a, 110, 120, 12, '#ff9a5a', 0.3); glow(a, 110, 124, 60, '#ffd890', 0.8)
    im = to_im(a); d = ImageDraw.Draw(im)
    d.pieslice((80, 94, 140, 154), 180, 360, fill=hexc('#ffe8b0'))
    cloud(d, 170, 40, 90, '#5a1420', '#a83a3a'); cloud(d, -10, 66, 80, '#6a1824', '#c04a3a')
    base = '#1a060c'
    for x, w, h in [(150, 22, 70), (178, 40, 48), (222, 18, 84), (244, 34, 54), (282, 22, 66), (20, 16, 40)]:
        d.rectangle((x, 140 - h, x + w, 150), fill=hexc(base))
        for bx in range(x, x + w, 6): d.rectangle((bx, 136 - h, bx + 3, 140 - h), fill=hexc(base))
        if h > 60: poly(d, [(x - 2, 140 - h), (x + w / 2, 122 - h), (x + w + 2, 140 - h)], base)
    for x, y in [(231, 40), (160, 54)]:                                                     # torn banners
        d.line((x, y, x, y - 14), fill=hexc('#2a0a10'))
        poly(d, [(x, y - 14), (x + 12, y - 11), (x + 8, y - 8), (x + 13, y - 5), (x, y - 6)], '#7a1020')
    poly(d, [(0, 150), (80, 144), (180, 150), (320, 144), (320, 180), (0, 180)], '#10040a')
    return im


def bg_nu():
    """THE MAIN STAGE: a dark arena cut by pink and cyan spotlights, speaker stacks, a crowd with its hands up."""
    a = bands([(0, '#05020f'), (0.5, '#1a0838'), (1, '#3a0c5a')], y1=150)
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    for cx, ang, col in [(40, 0.55, '#ff4ad8'), (110, 0.25, '#3ae8ff'), (210, -0.25, '#ff4ad8'), (280, -0.55, '#3ae8ff')]:
        dx = xx - (cx + yy * math.tan(ang)); beam = np.abs(dx) < 4 + yy * 0.16
        dither_blend(a, beam, col, 0.32 * (yy / h + 0.2))
    glow(a, 205, 120, 70, '#ff7ae0', 0.35)
    im = to_im(a); d = ImageDraw.Draw(im)
    for x in (6, 270):                                                                       # speaker stacks
        for j in range(3):
            y = 92 + j * 22; d.rectangle((x, y, x + 44, y + 20), fill=hexc('#0c0816')); d.rectangle((x, y, x + 44, y + 1), fill=hexc('#2a1a40'))
            d.ellipse((x + 6, y + 3, x + 20, y + 17), fill=hexc('#1a1030')); d.ellipse((x + 26, y + 5, x + 38, y + 15), fill=hexc('#1a1030'))
    d.rectangle((0, 150, 320, 180), fill=hexc('#080412'))
    r = random.Random(4)
    for i in range(46):                                                                      # the crowd
        x = i * 7 + r.randrange(4); y = 156 + r.randrange(6)
        d.ellipse((x, y - 6, x + 6, y), fill=hexc('#120826')); d.rectangle((x, y - 1, x + 6, 180), fill=hexc('#120826'))
        if r.random() < 0.45: d.line((x + 1, y - 2, x - 2 + r.randrange(3), y - 12), fill=hexc('#120826'), width=2)
    for x in range(0, 320, 16): d.rectangle((x, 4, x + 6, 6), fill=hexc('#ffd8f8' if (x // 16) % 2 else '#a8f8ff'))
    return im


def bg_aero():
    """AERO MEADOW: a glossy Frutiger Aero sky, a bright sun, shiny rolling hills, bubbles."""
    a = bands([(0, '#1a8ef0'), (0.45, '#5cc8ff'), (0.8, '#b8f0ff'), (1, '#eafff8')], y1=130)
    rays(a, 230, 40, 12, '#ffffff', 0.22); glow(a, 230, 40, 46, '#ffffff', 0.85)
    im = to_im(a); d = ImageDraw.Draw(im)
    cloud(d, 20, 30, 80, '#e8f8ff', '#ffffff'); cloud(d, 120, 56, 60, '#e0f4ff', '#ffffff')
    for cx, cy, rr, top, side in [(60, 190, 120, '#7ae05a', '#3aa83a'), (250, 196, 140, '#5ad04a', '#2a9030'), (160, 210, 110, '#9ae86a', '#4ab840')]:
        d.ellipse((cx - rr, cy - rr * 0.55, cx + rr, cy + rr * 0.55), fill=hexc(side))
        d.ellipse((cx - rr + 4, cy - rr * 0.55, cx + rr - 4, cy + rr * 0.5 - 6), fill=hexc(top))
        d.arc((cx - rr + 14, cy - rr * 0.5 + 3, cx + rr - 14, cy + rr * 0.5), 200, 250, fill=hexc('#e8ffd0'), width=2)
    for cx, cy, rr in [(30, 100, 9), (296, 76, 12), (270, 120, 6), (90, 64, 5)]:          # bubbles
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=hexc('#ffffff'))
        d.arc((cx - rr + 2, cy - rr + 2, cx + rr - 2, cy + rr - 2), 200, 260, fill=hexc('#ffffff'))
    return im


def bg_gnash():
    """AFTER HOURS: a city at night in magenta, a skyline of neon windows, a big neon sign, wet rooftop."""
    a = bands([(0, '#060110'), (0.45, '#200632'), (0.8, '#6a0e5a'), (1, '#c02a7a')], y1=130)
    glow(a, 120, 128, 90, '#ff3aa8', 0.35)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 30, '#ff9ad8', 9, 60)
    r = random.Random(11)
    for layer, col, win in [(0, '#1a0628', '#5a2a8a'), (1, '#0c0216', '#3af0ff')]:
        x = -4
        while x < 320:
            bw = 14 + r.randrange(22); bh = (40 if layer else 60) + r.randrange(50)
            top = 130 - bh + layer * 10
            d.rectangle((x, top, x + bw, 160), fill=hexc(col))
            for wy in range(top + 4, 150, 6):
                for wx in range(x + 3, x + bw - 2, 5):
                    if r.random() < 0.32: d.rectangle((wx, wy, wx + 1, wy + 2), fill=hexc(win if r.random() < 0.7 else '#c8ff3a'))
            x += bw + 2
    d.rectangle((228, 52, 296, 70), outline=hexc('#c8ff3a'), width=2)                       # a neon sign (no words, just a skull-ish X)
    d.line((240, 56, 252, 66), fill=hexc('#3af0ff'), width=2); d.line((252, 56, 240, 66), fill=hexc('#3af0ff'), width=2)
    d.line((272, 56, 284, 66), fill=hexc('#3af0ff'), width=2); d.line((284, 56, 272, 66), fill=hexc('#3af0ff'), width=2)
    d.rectangle((0, 156, 320, 180), fill=hexc('#08020e'))
    for x in range(0, 320, 3): d.point((x, 158 + (x * 7) % 4), fill=hexc('#ff4ab8' if x % 2 else '#3af0ff'))   # wet reflections
    return im


def bg_hanz():
    """HIS POLYGON ROOM (hanz_poly.py's own picture), shrunk to the backdrop's size."""
    im = Image.open(os.path.join(ROOT, 'public/assets/shop/lost/poly_room.png')).convert('RGBA')
    bgc = Image.new('RGBA', im.size, (40, 20, 70, 255)); bgc.alpha_composite(im)
    return bgc.resize((BG_W, BG_H), Image.NEAREST)


def bg_lumen():
    """THE STARFALL: a deep violet night full of stars, constellations drawn between the bright ones, the purple
    star falling across the sky with a long burning tail, and black mountains under it."""
    a = bands([(0, '#03020c'), (0.4, '#120a34'), (0.75, '#2e1462'), (1, '#5a2a8a')], y1=150)
    glow(a, 92, 46, 60, '#7a4ad8', 0.5)
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    # the tail: a dithered streak from the top right down to the star
    t = ((xx - 92) * 0.82 + (yy - 46) * -0.57); dist = np.abs((xx - 92) * 0.57 + (yy - 46) * 0.82)
    tail = (t > 0) & (t < 240) & (dist < 2 + t * 0.06)
    dither_blend(a, tail, '#c89aff', np.clip(1 - t / 240, 0, 1) * 0.9)
    dither_blend(a, tail & (dist < 1 + t * 0.02), '#ffffff', np.clip(1 - t / 160, 0, 1))
    glow(a, 92, 46, 22, '#e8d0ff', 0.9); glow(a, 92, 46, 8, '#ffffff', 1)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 110, '#e8e0ff', 31, 130)
    for pts in ([(196, 30), (214, 44), (238, 38), (256, 58), (282, 50)], [(20, 70), (40, 86), (34, 108)], [(220, 96), (244, 84), (270, 100)]):   # constellations
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            for k in range(0, 100, 8):
                u = k / 100; d.point((x0 + (x1 - x0) * u, y0 + (y1 - y0) * u), fill=hexc('#8a7ad8'))
        for x, y in pts:
            d.point((x, y), fill=hexc('#ffffff'))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): d.point((x + dx, y + dy), fill=hexc('#c8b8ff'))
    poly(d, [(0, 150), (40, 118), (70, 132), (110, 98), (150, 130), (190, 112), (240, 136), (290, 106), (320, 124), (320, 180), (0, 180)], '#1a0c36')
    for x, y in [(110, 98), (290, 106)]: poly(d, [(x - 8, y + 8), (x, y), (x + 8, y + 8), (x + 3, y + 6), (x - 3, y + 7)], '#6a5aa8')   # snow on the peaks
    poly(d, [(0, 160), (80, 146), (170, 156), (260, 144), (320, 152), (320, 180), (0, 180)], '#0c0620')
    d.rectangle((0, 168, 320, 180), fill=hexc('#06030f'))
    return im


def bg_vanta():
    """NEON DISTRICT: a narrow street at night under a huge white moon sliced clean in two, stacked neon sign
    boxes up the buildings in cyan and magenta, power lines, wet asphalt throwing the colours back."""
    a = bands([(0, '#04030c'), (0.45, '#0e0a26'), (0.8, '#2a0c44'), (1, '#4a1060')], y1=140)
    glow(a, 168, 54, 70, '#4a2a8a', 0.5)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 40, '#a8c8ff', 13, 70)
    d.ellipse((134, 20, 202, 88), fill=hexc('#e8f0ff')); d.ellipse((140, 24, 202, 88), fill=hexc('#d0dcf4'))   # the moon...
    poly(d, [(120, 90), (124, 88), (214, 16), (210, 18)], '#04030c')                        # ...cut clean through
    d.line((118, 92, 216, 14), fill=hexc('#3af0ff'), width=1)
    r = random.Random(17)
    for side, x0, x1 in ((0, -6, 112), (1, 214, 330)):                                        # the buildings either side
        x = x0
        while x < x1:
            bw = 18 + r.randrange(20); top = 30 + r.randrange(60)
            d.rectangle((x, top, x + bw, 160), fill=hexc('#0a0618'))
            for wy in range(top + 6, 150, 7):
                for wx in range(x + 3, x + bw - 3, 5):
                    if r.random() < 0.25: d.rectangle((wx, wy, wx + 1, wy + 2), fill=hexc('#3a2a6a'))
            if r.random() < 0.8:                                                             # a stacked neon sign box
                sx = x + (bw - 8 if side == 0 else 0); sy = top + 10 + r.randrange(20); col = '#3af0ff' if r.random() < 0.5 else '#ff3aa8'
                d.rectangle((sx, sy, sx + 8, sy + 36), fill=hexc('#06020e'), outline=hexc(col))
                for k in range(4): d.rectangle((sx + 3, sy + 4 + k * 8, sx + 5, sy + 8 + k * 8), fill=hexc(col))
            x += bw + 1
    for y in (40, 46): d.line((0, y + 10, 320, y), fill=hexc('#06030c'))                      # power lines
    a = np.array(im.convert('RGB')); glow(a, 60, 70, 40, '#ff3aa8', 0.3); glow(a, 270, 80, 40, '#3af0ff', 0.3); im = to_im(a); d = ImageDraw.Draw(im)
    d.rectangle((0, 156, 320, 180), fill=hexc('#06030c'))
    for x in range(0, 320, 2):                                                               # the wet street throws the neon back
        c = '#3af0ff' if (x // 6) % 3 == 0 else '#ff3aa8' if (x // 6) % 3 == 1 else '#8a7ad8'
        if r.random() < 0.5: d.line((x, 160 + r.randrange(6), x, 166 + r.randrange(10)), fill=hexc(c))
    for x in range(150, 180, 3): d.point((x, 170 + (x % 4)), fill=hexc('#e8f0ff'))           # the moon in a puddle
    return im


def bg_kami():
    """THE ARCHIVE: the endless stacks at night - shelves of books climbing out of sight, warm lamplight, a reading
    desk, and loose pages drifting down through the air."""
    a = bands([(0, '#120806'), (0.4, '#2a1410'), (0.75, '#5a3018'), (1, '#8a5a2a')], y1=170)
    rays(a, 200, -10, 6, '#ffe0a0', 0.18, spin=1.2); glow(a, 200, 40, 90, '#ffc870', 0.45)
    im = to_im(a); d = ImageDraw.Draw(im)
    r = random.Random(23)
    for sx, sw, shade in ((-4, 70, '#1a0c08'), (250, 74, '#1a0c08'), (66, 40, '#2a160e'), (214, 38, '#2a160e')):   # the stacks
        d.rectangle((sx, 0, sx + sw, 160), fill=hexc(shade))
        for sy in range(6, 156, 16):
            d.rectangle((sx, sy + 13, sx + sw, sy + 15), fill=hexc('#3a2012'))
            bx = sx + 2
            while bx < sx + sw - 3:
                bw = 2 + r.randrange(3); bh = 8 + r.randrange(5)
                col = r.choice(['#7a2a1e', '#3a5a6a', '#8a6a2a', '#4a3a6a', '#6a1a1a', '#c8b890', '#2a4a2a'])
                if shade == '#2a160e': col = '#' + ''.join('%02x' % (int(int(col[i:i + 2], 16) * 0.6)) for i in (1, 3, 5))
                d.rectangle((bx, sy + 13 - bh, bx + bw - 1, sy + 12), fill=hexc(col)); bx += bw + (1 if r.random() < 0.2 else 0)
    for x in (110, 196):                                                                      # hanging lamps
        d.line((x, 0, x, 30), fill=hexc('#2a160e')); poly(d, [(x - 6, 36), (x - 3, 30), (x + 3, 30), (x + 6, 36)], '#3a2012')
        a = np.array(im.convert('RGB')); glow(a, x, 38, 30, '#ffd890', 0.7); glow(a, x, 37, 5, '#ffffff', 1); im = to_im(a); d = ImageDraw.Draw(im)
    d.rectangle((0, 150, 320, 180), fill=hexc('#1a0c08'))
    for x in range(0, 320, 12): d.line((x, 150, x - 8, 180), fill=hexc('#2a1610'))           # floorboards
    d.rectangle((40, 132, 104, 136), fill=hexc('#4a2a16')); d.rectangle((44, 136, 48, 152), fill=hexc('#2a160e')); d.rectangle((96, 136, 100, 152), fill=hexc('#2a160e'))   # a desk
    for bx, by, bw in ((50, 124, 18), (54, 118, 14), (74, 128, 22)): d.rectangle((bx, by, bx + bw, by + 6 if bw < 20 else by + 4), fill=hexc('#c8a870'))
    for _ in range(14):                                                                       # pages in the air
        x, y = r.randrange(320), r.randrange(10, 140); tilt = r.randrange(-3, 4)
        poly(d, [(x, y), (x + 7, y + tilt), (x + 7 + tilt // 2, y + 9 + tilt), (x + tilt // 2, y + 9)], '#efe0c0')
        d.line((x + 1, y + 3, x + 5, y + 3 + tilt // 2), fill=hexc('#8a7a5a'))
    return im


def bg_vitrail():
    """THE CHAPEL OF THE SKY SANCTUM: inside, at dusk - the great rose window behind him, four quarters burning fire,
    ice, gold and violet, its light falling across the floor in coloured shafts; stone columns and candles."""
    a = bands([(0, '#06040e'), (0.5, '#14102a'), (1, '#2a1e3a')], y1=180)
    cx, cy, R = 200, 62, 54
    glow(a, cx, cy, 110, '#4a3a7a', 0.5)
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    for k, col in enumerate(('#ff6a2a', '#7ae8ff', '#ffe04a', '#a04aff')):                    # its light on the floor
        x0 = cx - 60 + k * 40; beam = (yy > cy) & (np.abs(xx - (x0 + (yy - cy) * (k - 1.5) * 0.35)) < 9 + (yy - cy) * 0.12)
        dither_blend(a, beam, col, 0.25 * np.clip((yy - cy) / 120, 0, 1) + 0.05)
    im = to_im(a); d = ImageDraw.Draw(im)
    a = np.array(im)                                                                          # the rose window, per pixel
    quad = {(0, 0): '#ff6a2a', (1, 0): '#7ae8ff', (1, 1): '#ffe04a', (0, 1): '#a04aff'}
    for y in range(cy - R - 4, cy + R + 5):
        for x in range(cx - R - 4, cx + R + 5):
            dx, dy = x - cx, y - cy; dd = math.hypot(dx, dy)
            if dd > R + 4: continue
            if dd > R: a[y, x] = (*hexc('#3a3050'), 255); continue                            # the stone ring
            if dd > R - 1.5: a[y, x] = (*hexc('#f2c84a'), 255); continue                      # gilt
            ang = math.atan2(dy, dx); petal = abs(math.sin(ang * 4)) * 10
            if abs(dx) < 1.5 or abs(dy) < 1.5 or abs(dd - 30) < 1.2 or abs(dd - (R - 8 + petal * 0.3)) < 0.9 or dd < 8 or abs(math.sin(ang * 8)) < 0.08 * (dd > 30):
                a[y, x] = (*hexc('#0c0a12'), 255); continue                                   # lead
            base = hexc(quad[(int(dx > 0), int(dy > 0))])
            k = 0.35 if (dx + dy) < -R * 0.5 else -0.25 if dd > R - 10 else 0
            c = tuple(int(v + (255 - v) * k) if k > 0 else int(v * (1 + k)) for v in base)
            if (x * 7 + y * 13) % 23 == 0: c = tuple(min(255, v + 60) for v in c)              # glints in the glass
            a[y, x] = (*c, 255)
    for y in range(cy - 6, cy + 7):
        for x in range(cx - 6, cx + 7):
            if math.hypot(x - cx, y - cy) < 6: a[y, x] = (*hexc('#e8c8ff'), 255)
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    for x in (30, 92, 290):                                                                   # columns
        d.rectangle((x, 0, x + 18, 156), fill=hexc('#120e20')); d.rectangle((x + 2, 0, x + 4, 156), fill=hexc('#241e3a'))
        d.rectangle((x - 3, 150, x + 21, 158), fill=hexc('#1a1430')); d.rectangle((x - 3, 22, x + 21, 28), fill=hexc('#1a1430'))
    d.rectangle((0, 156, 320, 180), fill=hexc('#0c0a16'))
    for x in range(0, 320, 20): d.line((x, 156, x - 14, 180), fill=hexc('#16122a'))
    for x in (56, 130, 262):                                                                  # candles
        d.rectangle((x, 140, x + 3, 156), fill=hexc('#e8dcc0')); d.point((x + 1, 138), fill=hexc('#ffe8a0')); d.point((x + 1, 137), fill=hexc('#ffffff'))
        aa = np.array(im.convert('RGB')); glow(aa, x + 1, 138, 12, '#ffd890', 0.6); im = to_im(aa); d = ImageDraw.Draw(im)
    return im


def bg_roster():
    """OPERATION REBIRTH: a stormy violet-to-orange sky, giant rays from the horizon, clouds lit from below."""
    a = bands([(0, '#0a0618'), (0.4, '#2a0e4a'), (0.7, '#8a2a6a'), (0.88, '#ff7a4a'), (1, '#ffd08a')], y1=150)
    rays(a, 160, 150, 16, '#ffb070', 0.3); glow(a, 160, 150, 90, '#ffd8a0', 0.6)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 50, '#e8d8ff', 21, 60)
    cloud(d, 0, 50, 100, '#4a1a5a', '#c05a7a'); cloud(d, 220, 38, 110, '#4a1a5a', '#c05a7a')
    poly(d, [(0, 152), (50, 120), (90, 140), (130, 110), (170, 136), (220, 104), (270, 132), (320, 116), (320, 180), (0, 180)], '#160a24')
    d.rectangle((0, 160, 320, 180), fill=hexc('#0c0616'))
    return im


# ---------------------------------------------------------------------------------------------- the heroes
def outline(im, color=(10, 6, 18, 255)):
    """Adds a 1 px dark outline round a sprite (the comic-art edge that separates it from a busy backdrop)."""
    a = np.array(im); al = a[..., 3] > 0
    ring = np.zeros_like(al)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): ring |= np.roll(np.roll(al, dy, 0), dx, 1)
    ring &= ~al
    a[ring] = color
    return Image.fromarray(a)


def shadowed(im, color=(20, 8, 34, 255), off=(2, 2)):
    """The comic offset shadow, baked on the sprite's own pixel grid (so it scales with it and never smears)."""
    a = np.array(im); al = a[..., 3] > 0
    out = np.zeros((a.shape[0] + off[1], a.shape[1] + off[0], 4), np.uint8)
    out[off[1]:, off[0]:][al] = color
    out[:a.shape[0], :a.shape[1]][al] = a[al]
    return Image.fromarray(out)


def trim(im, pad=2):
    """Crops a sprite to its pixels (plus pad)."""
    bb = im.getbbox(); return im.crop((bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad))


def hero_from(fid, w, h, i):
    """The pose: frame i of the fighter's moves sheet, trimmed and outlined."""
    sheet = Image.open(os.path.join(FIGHTERS, fid, 'moves_sheet.png')).convert('RGBA'); cols = sheet.width // w
    fr = sheet.crop(((i % cols) * w, (i // cols) * h, (i % cols) * w + w, (i // cols) * h + h))
    return outline(trim(fr))


def hero_hanz():
    """HANZ & $@L: his whole-body render facing you, arms up to the sky (hanz_fight.py's `raise`, THE STARFALL)."""
    src = open(os.path.join(ROOT, 'src/scenes/lostFrames.js')).read()
    L = json.loads(src.split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
    s = L['fight']['f']['raise']; f = s['frames'][-6]
    sheet = Image.open(os.path.join(ROOT, 'public/assets/shop/lost', s['sheets'][f['k']])).convert('RGBA')
    return outline(trim(sheet.crop((f['sx'], f['sy'], f['sx'] + f['w'], f['sy'] + f['h']))))


def hero_roster():
    """The three founders side by side: Lacy, Soul Summoner in front, Mr Wake."""
    a, b, c = hero_from(*POSES['hero-knight']), hero_from(*POSES['soul-summoner']), hero_from(*POSES['mr-wake'])
    W = a.width + b.width + c.width - 40; H = max(a.height, b.height, c.height)
    im = Image.new('RGBA', (W, H))
    im.alpha_composite(a, (0, H - a.height)); im.alpha_composite(c, (W - c.width, H - c.height)); im.alpha_composite(b, (a.width - 20, H - b.height))
    return im


SCREENS = {
    'roster': (bg_roster, hero_roster), 'soul-summoner': (bg_soul, None), 'mr-wake': (bg_wake, None),
    'hero-knight': (bg_lacy, None), 'nu': (bg_nu, None), 'aero': (bg_aero, None), 'gnash': (bg_gnash, None), 'hanz': (bg_hanz, hero_hanz),
    'lumen': (bg_lumen, None), 'vanta': (bg_vanta, None), 'kami': (bg_kami, None), 'vitrail': (bg_vitrail, None),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.png') and not f.startswith('story-'): os.remove(os.path.join(OUT, f))
    previews = []
    for sid, (bgf, herof) in SCREENS.items():
        bg = bgf(); hero = herof() if herof else hero_from(*POSES[sid])
        bg.convert('RGB').quantize(255, dither=Image.NONE).save(os.path.join(OUT, sid + '_bg.png'), optimize=True)
        hero = shadowed(hero); hero.save(os.path.join(OUT, sid + '_hero.png'), optimize=True)
        print(sid, bg.size, hero.size)
        if '--preview' in sys.argv:
            p = bg.resize((BG_W * 3, BG_H * 3), Image.NEAREST); k = int(BG_H * 3 * 0.78 / hero.height) or 1
            hh = hero.resize((hero.width * k, hero.height * k), Image.NEAREST)
            p.alpha_composite(hh, (int(BG_W * 3 * 0.66 - hh.width / 2), BG_H * 3 - hh.height - 20)); previews.append(p)
    if previews:
        sheet = Image.new('RGBA', (BG_W * 3 * 2, BG_H * 3 * ((len(previews) + 1) // 2)))
        for i, p in enumerate(previews): sheet.paste(p, ((i % 2) * BG_W * 3, (i // 2) * BG_H * 3))
        sheet.save(sys.argv[sys.argv.index('--preview') + 1])


if __name__ == '__main__':
    main()
