"""Pictures for the shopkeeper's code PAPERSPLEASE (Trinkets > SHOP):

  face_sickle.png   his screen while the code is on: a gold hammer and sickle under a red star, a shine sweeping
                    across it (8 frames of 64x64, like his other faces)
  poster.png        the OUR VICTORY achievement's poster: a red sunburst, a gold hammer and sickle, an industrial
                    worker and a farmer holding hands, factories and a wheat field behind them, and the words
                    WORKERS OF THE WORLD UNITE! underneath (128x176)
  flag_emblem.png   the gold hammer, sickle and star in the corner of the shop's red flags (16x16)
  dolls.png         the nesting dolls of the MATRYOSHKA machines: three paint jobs (red, blue, gold) x whole / top half /
                    bottom half, 40x56 each, in one row - and frame 9 is the VODKA bottle (EXTRAS, unlocks STALINGRAD)

  python3 tools/sprites/soviet_art.py        -> public/assets/shop/
"""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/shop')
FONT = os.path.join(os.path.dirname(__file__), 'art/PressStart2P.ttf')   # the game's own pixel font (SIL Open Font License)

def rgb(c): return ((c >> 16) & 255, (c >> 8) & 255, c & 255, 255)

# ---------------------------------------------------------------------------------- shapes, drawn crisp
def mask(size, fn, ss=4):
    """A shape as a crisp pixel mask: fn(x, y) in unit coordinates (0..1), sampled ss x ss per pixel, kept where
    more than half the samples are inside."""
    w, h = size
    ys, xs = np.mgrid[0:h * ss, 0:w * ss]
    m = fn((xs + 0.5) / (w * ss), (ys + 0.5) / (h * ss))
    return m.reshape(h, ss, w, ss).mean((1, 3)) > 0.5

def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy))

def sickle_hammer(x, y):
    """The hammer and sickle, in a unit square (y down). Laid out on a 32 x 32 grid: the sickle's blade is a C round
    (16, 15), thick at the handle and over the top, thinning to its point on the right; its handle comes out at the
    lower left. The hammer's shaft runs from the lower right up into the middle of the C, its head across the end."""
    X, Y = x * 32, y * 32
    a = np.degrees(np.arctan2(Y - 15, X - 16)) % 360
    a2 = np.where(a >= 118, a, a + 360)                                     # 118 (the handle) round to 382 (the point)
    u = (a2 - 118) / 264
    thick = np.where(u < 0.45, 4.6, 4.6 - (u - 0.45) / 0.55 * 3.8)
    r = np.hypot(X - 16, Y - 15)
    blade = (r <= 13) & (r >= 13 - thick) & (u >= 0) & (u <= 1)
    handle = seg_dist(X, Y, 8.4, 25.6, 3.0, 30.0) < 1.9
    shaft = seg_dist(X, Y, 27.5, 28.5, 12.5, 13.5) < 1.35
    hx, hy, px, py = 11.6, 12.6, 0.7071, -0.7071                            # the head: across the shaft's end
    head = (np.abs((X - hx) * px + (Y - hy) * py) < 4.4) & (np.abs((X - hx) * 0.7071 + (Y - hy) * 0.7071) < 1.9)
    return (blade | handle) if PART == 'sickle' else (shaft | head) if PART == 'hammer' else (blade | handle | shaft | head)

PART = None                                                                 # (which piece sickle_hammer draws: None = both)

def _in_star(dx, dy, R, r):
    """Inside a five-pointed star (outer radius R, inner r) centred on 0, 0?"""
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5; rr = R if i % 2 == 0 else r
        pts.append((math.cos(ang) * rr, math.sin(ang) * rr))
    inside = np.zeros(dx.shape, bool)
    n = len(pts); j = n - 1
    for i in range(n):                                                               # point in polygon (even-odd)
        xi, yi = pts[i]; xj, yj = pts[j]
        cond = ((yi > dy) != (yj > dy)) & (dx < (xj - xi) * (dy - yi) / ((yj - yi) or 1e-9) + xi)
        inside ^= cond; j = i
    return inside

def paint(img, m, x0, y0, col):
    a = np.array(img); h, w = m.shape
    sub = a[y0:y0 + h, x0:x0 + w]; sub[m[:sub.shape[0], :sub.shape[1]]] = rgb(col); a[y0:y0 + h, x0:x0 + w] = sub
    return Image.fromarray(a)

def outline_of(m):
    o = np.zeros_like(m)
    o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    return o & ~m

def emblem(size, gold=(0xfff0a0, 0xffd040, 0xc89a20, 0x8a6010), out=0x3a2004, shine=None):
    """A shaded gold hammer and sickle on a transparent square, size x size: the sickle first, then the hammer over it
    with its own dark outline so the two read apart. shine: a diagonal band (0..1) lit up."""
    global PART
    a = np.zeros((size, size, 4), np.uint8)
    for part in ('sickle', 'hammer'):
        PART = part; m = mask((size, size), sickle_hammer); PART = None
        a[outline_of(m)] = rgb(out)
        ys, xs = np.nonzero(m)
        for x, y in zip(xs, ys):
            up = not (y > 0 and m[y - 1, x]) or not (x > 0 and m[y, x - 1])          # light from the upper left
            dn = not (y < size - 1 and m[y + 1, x]) or not (x < size - 1 and m[y, x + 1])
            c = gold[0] if up else gold[2] if dn else gold[1]
            if shine is not None and abs((x + y) / (2 * size) - shine) < 0.06: c = 0xffffff if up else gold[0]
            a[y, x] = rgb(c)
    return a

def star_img(size, cols=(0xff6a5a, 0xe8201e, 0x9a0e0e), out=0x3a0404):
    m = mask((size, size), lambda x, y: _in_star(x - 0.5, y - 0.53, 0.5, 0.2))
    a = np.zeros((size, size, 4), np.uint8)
    ys, xs = np.nonzero(m)
    for x, y in zip(xs, ys): a[y, x] = rgb(cols[0] if x < size / 2 and y < size * 0.55 else cols[2] if x > size / 2 and y > size * 0.5 else cols[1])
    a[outline_of(m)] = rgb(out)
    return a

def blit(dst, src, x0, y0):
    h, w = src.shape[:2]; m = src[..., 3] > 0
    region = dst[y0:y0 + h, x0:x0 + w]; region[m] = src[m]

# ---------------------------------------------------------------------------------- his face
def face_sickle():
    frames = []
    for i in range(8):
        f = np.zeros((64, 64, 4), np.uint8)
        blit(f, star_img(11), 27, 3)
        blit(f, emblem(40, shine=-0.2 + i * 0.2), 12, 16)
        frames.append(f)
    Image.fromarray(np.concatenate(frames, 1)).save(os.path.join(OUT, 'face_sickle.png'))

# ---------------------------------------------------------------------------------- the poster
def poster():
    W, H = 128, 176
    im = Image.new('RGBA', (W, H), rgb(0xc8201e)); d = ImageDraw.Draw(im)
    for k in range(24):                                                              # a sunburst behind it all
        a0, a1 = k * 2 * math.pi / 24, (k + 0.5) * 2 * math.pi / 24
        d.polygon([(64, 40), (64 + math.cos(a0) * 300, 40 + math.sin(a0) * 300), (64 + math.cos(a1) * 300, 40 + math.sin(a1) * 300)], fill=rgb(0xa8141a))
    # factories on the left, a wheat field on the right, under a low horizon
    for (x, w_, h_) in ((2, 16, 30), (16, 12, 22), (26, 18, 36), (42, 10, 18)):
        d.rectangle([x, 128 - h_, x + w_, 128], fill=rgb(0x5a0a0e))
        for wy in range(128 - h_ + 4, 124, 6):
            for wx in range(x + 2, x + w_ - 2, 4): d.rectangle([wx, wy, wx + 1, wy + 2], fill=rgb(0xffb040))
    for (x, top) in ((8, 74), (31, 66), (36, 70)):                                    # chimneys and smoke
        d.rectangle([x, top, x + 3, 100], fill=rgb(0x4a080c))
        for k in range(5): d.ellipse([x - 2 + k * 5, top - 8 - k * 5, x + 6 + k * 6, top - 2 - k * 4], fill=rgb(0x8a1418))
    d.polygon([(72, 128), (128, 112), (128, 128)], fill=rgb(0xd8a028))
    for x in range(74, 128, 3):                                                      # wheat ears
        t = 128 - (x - 72) * 0.28
        d.line([(x, 128), (x + 1, t - 4)], fill=rgb(0xf4c84a)); d.point((x + 1, t - 5), fill=rgb(0xfff0a0))
    d.rectangle([0, 128, W, 136], fill=rgb(0x5a0a0e))
    # the two of them: a worker (cap, blue overalls, a hammer held high) and a farmer (headscarf, a sheaf of wheat)
    SK, SKd, SKs = 0xf0c8a0, 0xd09a74, 0x8a5a3a
    def person(cx, top, cloth, cloth_d, cap, cap_d, mirror):
        s = -1 if mirror else 1
        d.polygon([(cx - 8, top + 20), (cx + 8, top + 20), (cx + 10, top + 46), (cx - 10, top + 46)], fill=rgb(cloth))   # body
        d.polygon([(cx + 2 * s, top + 20), (cx + 8 * s, top + 20), (cx + 10 * s, top + 46), (cx + 4 * s, top + 46)], fill=rgb(cloth_d))
        d.rectangle([cx - 7, top + 46, cx - 2, top + 62], fill=rgb(cloth_d)); d.rectangle([cx + 2, top + 46, cx + 7, top + 62], fill=rgb(cloth_d))   # legs
        d.rectangle([cx - 8, top + 61, cx - 1, top + 64], fill=rgb(0x2a1008)); d.rectangle([cx + 1, top + 61, cx + 8, top + 64], fill=rgb(0x2a1008))   # boots
        d.rectangle([cx - 2, top + 15, cx + 2, top + 20], fill=rgb(SKd))                                              # neck
        d.ellipse([cx - 6, top + 3, cx + 6, top + 17], fill=rgb(SK))
        d.point((cx - 2, top + 9), fill=rgb(0x2a1a10)); d.point((cx + 2, top + 9), fill=rgb(0x2a1a10))               # eyes, a determined mouth
        d.line([(cx - 2, top + 13), (cx + 2, top + 13)], fill=rgb(SKs))
        d.point((cx - 3, top + 11), fill=rgb(0xe8a088)); d.point((cx + 3, top + 11), fill=rgb(0xe8a088))
        return s
    # worker on the left
    wx, wt = 46, 62
    person(wx, wt, 0x2a4a9a, 0x1a3070, 0, 0, False)
    d.polygon([(wx - 7, wt + 4), (wx + 7, wt + 4), (wx + 9, wt + 7), (wx - 7, wt + 7)], fill=rgb(0x2a2a3a))             # flat cap
    d.rectangle([wx - 6, wt + 1, wx + 5, wt + 4], fill=rgb(0x3a3a4e))
    d.rectangle([wx - 5, wt + 22, wx + 5, wt + 24], fill=rgb(0x3a62c0))                                                 # overall bib straps
    d.line([(wx - 8, wt + 22), (wx - 18, wt + 6)], fill=rgb(0x2a4a9a), width=4); d.ellipse([wx - 21, wt + 1, wx - 15, wt + 7], fill=rgb(SK))   # arm raised...
    d.line([(wx - 18, wt + 4), (wx - 18, wt - 12)], fill=rgb(0x7a4a24), width=2); d.rectangle([wx - 23, wt - 15, wx - 13, wt - 10], fill=rgb(0x8a8a9a))   # ...with a hammer
    d.rectangle([wx - 23, wt - 15, wx - 13, wt - 14], fill=rgb(0xc8c8d8))
    # farmer on the right
    fx, ft = 82, 62
    person(fx, ft, 0xf0ece0, 0xc8c0a8, 0, 0, True)
    d.polygon([(fx - 8, ft + 34), (fx + 10, ft + 34), (fx + 12, ft + 50), (fx - 10, ft + 50)], fill=rgb(0x8a1a1e))     # skirt
    d.polygon([(fx - 7, ft + 2), (fx + 7, ft + 2), (fx + 9, ft + 10), (fx + 7, ft + 14), (fx - 7, ft + 14), (fx - 9, ft + 10)], fill=rgb(0xd82a2a))   # headscarf...
    d.ellipse([fx - 5, ft + 6, fx + 5, ft + 17], fill=rgb(SK)); d.point((fx - 2, ft + 10), fill=rgb(0x2a1a10)); d.point((fx + 2, ft + 10), fill=rgb(0x2a1a10))
    d.line([(fx - 2, ft + 14), (fx + 2, ft + 14)], fill=rgb(SKs)); d.polygon([(fx + 4, ft + 14), (fx + 10, ft + 18), (fx + 6, ft + 19)], fill=rgb(0xd82a2a))   # ...knotted
    d.line([(fx + 8, ft + 22), (fx + 18, ft + 8)], fill=rgb(0xf0ece0), width=4); d.ellipse([fx + 15, ft + 3, fx + 21, ft + 9], fill=rgb(SK))   # arm raised...
    for k in range(-3, 4):                                                                                               # ...with a sheaf of wheat
        d.line([(fx + 18, ft + 6), (fx + 18 + k * 2, ft - 12)], fill=rgb(0xd8a028)); d.ellipse([fx + 16 + k * 2, ft - 16, fx + 20 + k * 2, ft - 9], fill=rgb(0xf4c84a))
    # holding hands in the middle
    d.line([(wx + 8, ft + 22), (64, ft + 32)], fill=rgb(0x2a4a9a), width=4); d.line([(fx - 8, ft + 22), (64, ft + 32)], fill=rgb(0xf0ece0), width=4)
    d.ellipse([60, ft + 28, 68, ft + 36], fill=rgb(SK)); d.point((64, ft + 32), fill=rgb(SKd))
    a = np.array(im)
    blit(a, emblem(36), 46, 8)                                                                                           # the hammer and sickle, up top
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    # the words, on a cream band
    d.rectangle([0, 136, W, H], fill=rgb(0xf4e8c8)); d.rectangle([0, 136, W, 137], fill=rgb(0x5a0a0e))
    f = ImageFont.truetype(FONT, 8)
    for i, line in enumerate(('WORKERS OF', 'THE WORLD,', 'UNITE!')):
        tw = d.textlength(line, font=f)
        d.text(((W - tw) / 2, 141 + i * 11), line, font=f, fill=rgb(0xb01418))
    d.rectangle([0, 0, W - 1, H - 1], outline=rgb(0xe8b030)); d.rectangle([1, 1, W - 2, H - 2], outline=rgb(0x5a0a0e))   # a gold frame
    # make everything opaque and crisp (no half-alpha pixels from the font)
    a = np.array(im); a[..., 3] = 255
    Image.fromarray(a).save(os.path.join(OUT, 'poster.png'))

# ---------------------------------------------------------------------------------- the vodka bottle
def vodka():
    W, H = 28, 56
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    G, Gd, Gh, O = 0xd8ecf4, 0xa8c4d0, 0xffffff, 0x3a5060
    d.rectangle([11, 2, 16, 7], fill=rgb(0xc8201e)); d.rectangle([11, 2, 16, 3], fill=rgb(0xff5a4a))                  # the cap
    d.polygon([(11, 8), (16, 8), (16, 16), (21, 22), (21, 52), (6, 52), (6, 22), (11, 16)], fill=rgb(G))               # the glass
    d.polygon([(16, 8), (16, 16), (21, 22), (21, 52), (17, 52), (17, 22), (14, 16), (14, 8)], fill=rgb(Gd))
    d.line([(8, 24), (8, 48)], fill=rgb(Gh)); d.line([(12, 10), (12, 15)], fill=rgb(Gh))                              # shine
    d.rectangle([6, 30, 21, 44], fill=rgb(0xf4ecd8)); d.rectangle([6, 30, 21, 32], fill=rgb(0xc8201e)); d.rectangle([6, 42, 21, 44], fill=rgb(0xc8201e))   # the label
    d.rectangle([8, 35, 19, 36], fill=rgb(0xc89a20)); d.rectangle([9, 38, 18, 39], fill=rgb(0x8a6010))
    a = np.array(im)
    m = a[..., 3] > 0; a[outline_of(m)] = rgb(O)
    return a

# ---------------------------------------------------------------------------------- nesting dolls
DOLL_PAINT = {   # body, its shadow, the trim, flowers
    'red': (0xd82a2a, 0x9a1418, 0xf4c84a, 0xffffff),
    'blue': (0x2a5ad8, 0x1a3a8a, 0xf4f0e0, 0xffd040),
    'gold': (0xf4c040, 0xc08a18, 0xd82a2a, 0xffffff),
}
def doll(paint):
    body, shade, trim, flower = DOLL_PAINT[paint]
    W, H = 40, 56
    def shape(x, y):
        head = np.hypot((x - 0.5) / 0.30, (y - 0.24) / 0.22) < 1
        belly = np.hypot((x - 0.5) / 0.44, (y - 0.66) / 0.34) < 1
        base = (y > 0.66) & (y < 0.98) & (np.abs(x - 0.5) < 0.40 - (y - 0.66) * 0.25)
        return head | belly | base
    m = mask((W, H), shape)
    a = np.zeros((H, W, 4), np.uint8)
    ys, xs = np.nonzero(m)
    for x, y in zip(xs, ys): a[y, x] = rgb(shade if x > W * 0.62 else body)
    face = mask((W, H), lambda x, y: np.hypot((x - 0.5) / 0.20, (y - 0.25) / 0.14) < 1)
    a[face] = rgb(0xf8e4d0)
    for (x, y, c) in ((17, 13, 0x2a1a10), (22, 13, 0x2a1a10), (15, 16, 0xf09a9a), (24, 16, 0xf09a9a), (19, 17, 0xc83a3a), (20, 17, 0xc83a3a)):
        a[y, x] = rgb(c)
    for x in range(14, 26): a[8, x] = rgb(0x5a2a10)                                     # hair under the scarf
    apron = mask((W, H), lambda x, y: np.hypot((x - 0.5) / 0.26, (y - 0.68) / 0.24) < 1)
    a[apron & m] = rgb(0xf8f0e0)
    for (cx, cy) in ((20, 36), (15, 40), (25, 40), (20, 44)):                           # flowers on the apron
        for (dx, dy) in ((0, -1), (1, 0), (0, 1), (-1, 0)): a[cy + dy, cx + dx] = rgb(body)
        a[cy, cx] = rgb(flower if flower != 0xffffff else trim)
    for x in range(W):                                                                  # the seam round its middle, trimmed
        for y in (28, 29):
            if m[y, x]: a[y, x] = rgb(trim)
    a[outline_of(m)] = rgb(0x2a0a08)
    top, bot = a.copy(), a.copy()
    top[29:] = 0; bot[:29] = 0
    return [a, top, bot]

def dolls():
    tiles = []
    for p in ('red', 'blue', 'gold'): tiles += doll(p)
    v = np.zeros((56, 40, 4), np.uint8); v[:, 6:34] = vodka(); tiles.append(v)     # frame 9: the VODKA bottle (it shares the file)
    Image.fromarray(np.concatenate(tiles, 1)).save(os.path.join(OUT, 'dolls.png'))

def flag_emblem():
    """the little gold hammer and sickle and star in the corner of the shop's red flags (16x16)"""
    a = np.zeros((16, 16, 4), np.uint8)
    blit(a, emblem(12, out=0x5a0a0a), 0, 4)
    blit(a, star_img(6, cols=(0xfff0a0, 0xffd040, 0xc89a20), out=0x5a0a0a), 2, 0)
    Image.fromarray(a).save(os.path.join(OUT, 'flag_emblem.png'))

if __name__ == '__main__':
    face_sickle(); poster(); dolls(); flag_emblem()
    print('done')
