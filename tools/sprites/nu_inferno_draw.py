"""NU's INFERNO costume: the headliner of a show that's on fire. Same body, joints and rig as nu_draw.py
(so every animation in nu_moves.py plays on it), redrawn:

  - his hair IS fire: tall licking flames, white-hot at the roots, flickering through 5 drawings
  - black studded leather jacket with a burning skull on the chest and flame cuffs
  - black leather pants with a red pinstripe, black platform boots with flames up the side
  - ash-pale face, black war paint, eyes glowing molten yellow through it, black lips
  - a gold mic with a red-hot grille on a glowing cable

  python3 tools/sprites/nu_inferno_draw.py preview.png   -> a big preview of the drawing
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw as N

FIRE = [(0xfff6c8, 0xffd060, 0xff8a1a), (0xffd060, 0xff8a1a, 0xc8320a), (0xff8a1a, 0xc8320a, 0x6a0a06)]
PAL = {
    'skin': (0xe8dcd4, 0xc4b0a6, 0x7a6460),
    'hair': (0xffd060, 0xff8a1a, 0xc8320a),
    'tip': (0xfff6c8, 0xffd060, 0xff8a1a),
    'hood': (0x3a3034, 0x221c20, 0x120e12),
    'pants': (0x2e282c, 0x1c181c, 0x0e0a0e),
    'shoe': (0x3a3236, 0x221c20, 0x0e0a0e),
    'chrome': (0xfff0a8, 0xe0a83a, 0x8a5a14),
    'acid': (0xffd060, 0xff7a1a, 0xb8320a),
    'band': (0x2a2226, 0x14101c, 0x0a080c),
}
OUT = 0x0c0608
hx = N.hx

def flame_hair(seed):
    """The hair as fire: five tongues of flame streaming up and back from his scalp, each a hot core inside
    an orange body with a dark red rim; `seed` shifts their heights and lean so the frames flicker."""
    rnd = np.random.RandomState(seed)
    a = np.zeros((64, 64, 4), np.uint8)
    im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    roots = [(27, 10), (30, 7), (33, 6), (36, 7), (39, 9)]
    for i, (x, y) in enumerate(roots):
        h = min(y - 0.5, 4 + [3, 5, 6, 4, 2][i] + rnd.randint(-1, 2))
        lean = -5 - (4 - i) * 0.8 + rnd.uniform(-1.5, 1.5)
        tip = (x + lean, y - h)
        d.polygon([(x - 3, y + 2), (x + lean * 0.4 - 2, y - h * 0.5), tip, (x + lean * 0.4 + 2, y - h * 0.45), (x + 3, y + 2)], fill=hx(FIRE[2][1]))
        d.polygon([(x - 2, y + 2), (x + lean * 0.5 - 1, y - h * 0.45), (x + lean * 0.8, y - h * 0.8), (x + 2, y + 2)], fill=hx(FIRE[1][1]))
        d.polygon([(x - 1, y + 2), (x + lean * 0.3, y - h * 0.4), (x + 1, y + 2)], fill=hx(FIRE[0][0]))
    # a base of flame over the scalp
    d.polygon([(27, 13), (26, 9), (30, 6), (37, 6), (40, 8), (40, 10), (36, 10), (30, 10), (29, 13)], fill=hx(FIRE[2][1]))
    d.polygon([(28, 10), (30, 8), (37, 8), (38, 9), (30, 9)], fill=hx(FIRE[0][1]))
    a = np.array(im)
    for _ in range(4):                                                       # sparks breaking off the tips
        x, y = rnd.randint(18, 40), rnd.randint(0, 5)
        if not a[y, x, 3]: a[y, x] = hx(FIRE[0][1])
    solid = a[..., 3] > 0
    ring = ~solid & (np.roll(solid, 1, 0) | np.roll(solid, -1, 0) | np.roll(solid, 1, 1) | np.roll(solid, -1, 1))
    ring[:, :1] = ring[:, -1:] = False
    a[ring] = hx(0x5a0a06)
    # the goggles still pushed up through the fire
    a[8:11, 35:39] = hx(PAL['chrome'][1]); a[8, 35:39] = hx(PAL['chrome'][0])
    a[9, 36:38] = hx(0xff2a1a); a[9, 36] = hx(0xffd060); a[11, 35:39] = hx(OUT)
    return a

def draw_parts():
    old, old_out = dict(N.PAL), N.OUT
    N.PAL.update(PAL); N.OUT = OUT
    try:
        P = N.draw_parts()
    finally:
        N.PAL.clear(); N.PAL.update(old); N.OUT = old_out
    # ---- jacket: studs on the shoulders, a burning skull on the chest instead of the NU print, flame cuffs
    t = P['torso']
    body = t[..., 3] > 0
    for (x, y) in [(27, 27), (27, 28), (27, 29), (27, 30), (28, 28), (29, 29), (30, 27), (30, 28), (30, 29), (30, 30),
                   (32, 27), (32, 28), (32, 29), (33, 30), (34, 30), (35, 27), (35, 28), (35, 29), (27, 26), (32, 26), (30, 26)]:
        if body[y, x]: t[y, x] = hx(PAL['hood'][1])
    skull = ['.###.', '#####', '#.#.#', '#####', '.#.#.']
    for j, row in enumerate(skull):
        for i, ch in enumerate(row):
            if ch == '#': t[27 + j, 29 + i] = hx(0xf0e6dc)
            elif j in (2,): t[27 + j, 29 + i] = hx(0xff3a1a)                # its eyes burn
    for i, x in enumerate(range(28, 36)):                                    # flames licking up from behind it
        h = [1, 2, 3, 2, 3, 2, 1, 1][i]
        for k in range(h):
            if body[26 - k, x]: t[26 - k, x] = hx([0xffd060, 0xff8a1a, 0xc8320a][min(2, k)])
    t[22:24, 25:42][t[22:24, 25:42, 3] > 0] = hx(0x14101c)                  # the collar turned up
    for x in range(26, 41, 3): t[22, x] = hx(PAL['chrome'][0])            # collar studs
    for y in range(31, 40, 2):                                               # the zip, gold
        t[y, 37] = hx(PAL['chrome'][1])
    t[40, 25:42] = hx(0x6a0a06)                                              # hem band, deep red
    for x in range(25, 42, 2): t[40, x] = hx(0xc8320a)
    P['torso'] = t
    for nm, cy in (('bfore', 35), ('ffore', 27)):                            # flame cuffs on the sleeves
        a = P[nm]; m = a[..., 3] > 0
        for x in range(64):
            for dy, c in ((0, 0xff8a1a), (-1, 0xffd060)):
                y = cy + dy
                if 0 <= y < 64 and m[y, x] and not np.all(a[y, x, :3] == np.array(hx(OUT)[:3])) and (x + dy) % 2 == 0: a[y, x] = hx(c)
    # ---- pants: a red pinstripe down each leg; boots: platform soles and a flame up the side
    for nm in ('bthigh', 'fthigh', 'bshin', 'fshin'):
        a = P[nm]; ys, xs = np.nonzero(a[..., 3] > 0)
        if not len(xs): continue
        cx = int(np.median(xs))
        for y in range(ys.min() + 1, ys.max()):
            if a[y, cx, 3] and not np.all(a[y, cx, :3] == np.array(hx(OUT)[:3])): a[y, cx] = hx(0x8a1a12)
    for nm, x0 in (('bshoe', 16), ('fshoe', 38)):
        a = P[nm]
        a[57, x0 - 1:x0 + 12] = hx(0x4a3a3a); a[58, x0:x0 + 11][a[58, x0:x0 + 11, 3] == 0] = hx(OUT)   # chunky platform
        for i, (dx, dy) in enumerate([(1, 0), (2, -1), (3, 0), (4, -2), (5, -1), (6, 0), (7, -1)]):
            y = 56 + dy
            if a[y, x0 + dx, 3]: a[y, x0 + dx] = hx([0xffd060, 0xff8a1a, 0xc8320a][i % 3])
            if a[y + 1, x0 + dx, 3]: a[y + 1, x0 + dx] = hx(0xc8320a)
        P[nm] = a
    # ---- face: ash pale, black war paint with molten eyes glowing through, black lips
    h = P['head']
    h[13, 36] = hx(0xfff6c8); h[13, 37] = hx(0xffd060); h[13, 38] = hx(0xff8a1a)
    h[13, 33] = hx(0xffd060); h[12, 33] = hx(0xff8a1a)
    for y in (15, 16, 17): h[y, 33] = hx(OUT)                               # war paint dripping down the cheek
    h[18, 36:39] = hx(OUT); h[19, 38] = hx(PAL['chrome'][0])
    P['head'] = h
    # ---- mic: red-hot grille; the cable glows
    m = P['mic']
    m[17, 44] = hx(0xfff6c8); m[17, 45] = hx(0xffd060); m[18, 44:46] = hx(0xff8a1a); m[16, 44] = hx(0xffffff)
    m[20, 43:47] = hx(0xc8320a)
    cable = np.all(m[..., :3] == np.array([0x24, 0x21, 0x2c]), -1) & (m[..., 3] > 0)
    m[cable] = hx(0xff5a1a)
    P['mic'] = m
    # ---- the hair: five flickering drawings of fire (hair_variants), the first is the part itself
    P['hair'] = flame_hair(0)
    return P

def hair_variants():
    return [flame_hair(s) for s in range(5)]

ORDER, RIG = N.ORDER, N.RIG
def composite(P, hide=('can',)): return N.composite(P, hide)

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (40, 30, 50, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'nu_inferno.png')
