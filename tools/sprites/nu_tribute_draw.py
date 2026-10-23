"""NU's TRIBUTE costumes: four nods to the classic nu-metal frontmen's stage looks - original drawings with original
names (no real names, faces or logos). Same body, joints and rig as nu_draw.py, so every animation in nu_moves.py
plays on them. Pick one with set_style():

  scream   SCREAMER     bleached short spikes, thick black glasses, flame tattoos on bare forearms, black tee,
                        olive cargo pants, black sneakers
  kilt     KILTED       long black dreads, a red tartan kilt, a sleeveless white track top with red stripes,
                        bare arms, black knee socks and boots
  prophet  THE PROPHET  long wild black hair and a big beard, an ornate maroon suit with gold paisley, a white shirt
  jumpsuit JUMPSUIT     a red boiler suit with a barcode patch, black boots, an original pale stitched mask with
                        black dreads spiking out of the top

  python3 tools/sprites/nu_tribute_draw.py preview.png
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw as N

hx = N.hx
STYLE = 'scream'
SKIN = (0xf0c09a, 0xd8986e, 0x9a603e)
STYLES = {
    'scream': {'hood': (0x3e3e46, 0x26262c, 0x121216), 'pants': (0x8a8a62, 0x64643e, 0x3e3e26), 'shoe': (0x4a4a52, 0x2a2a30, 0x141418),
               'band': (0x3e3e46, 0x26262c, 0x121216), 'acid': (0xff6a5a, 0xd8221e, 0x8a0e0e)},
    'kilt': {'hood': (0xffffff, 0xe6e6ec, 0xa4a4b0), 'pants': (0xe03a2a, 0xb01e1a, 0x6a0e0e), 'shoe': (0x3a3a40, 0x1e1e24, 0x0e0e12),
             'band': (0x2a2a30, 0x16161a, 0x08080a), 'acid': (0xff6a5a, 0xd8221e, 0x8a0e0e)},
    'prophet': {'hood': (0xb8384a, 0x7e1e30, 0x46101a), 'pants': (0xa83244, 0x741c2c, 0x40101a), 'shoe': (0x3a3a40, 0x1e1e24, 0x0e0e12),
                'band': (0xffffff, 0xe8e8ee, 0xa8a8b4), 'acid': (0xfff0a8, 0xe0a83a, 0x8a5a14)},
    'jumpsuit': {'hood': (0xf06a3a, 0xc8401e, 0x7a220e), 'pants': (0xf06a3a, 0xc8401e, 0x7a220e), 'shoe': (0x3a3a40, 0x1e1e24, 0x0e0e12),
                 'band': (0x3a3a40, 0x1e1e24, 0x0e0e12), 'acid': (0xb8c0ca, 0x8a929e, 0x4a525e)},
}
def set_style(s):
    global STYLE
    STYLE = s

def put(a, pts, col):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3]: a[y, x] = hx(col)

def solid_px(a):
    return (a[..., 3] > 0) & ~np.all(a[..., :3] == np.array(hx(N.OUT)[:3]), -1)

def clean(a, pal):
    """Every detail painted on a part goes back to its plain colour (keeping its light and dark shading)."""
    keep = [tuple(hx(c)[:3]) for c in (pal[0], pal[2])]
    m = solid_px(a)
    for y, x in zip(*np.nonzero(m)):
        if tuple(a[y, x, :3]) not in keep: a[y, x] = hx(pal[1])

def recolor(a, pal_from, pal_to):
    for f, t in zip(pal_from, pal_to):
        m = np.all(a[..., :3] == np.array(hx(f)[:3]), -1) & (a[..., 3] > 0); a[m] = hx(t)

def plain_face(h):
    h[12:15, 31:40][h[12:15, 31:40, 3] > 0] = hx(SKIN[1])
    h[13, 36] = hx(0x2a2630); h[13, 37] = hx(0xffffff); h[13, 33] = hx(0x2a2630)
    h[12, 36:38] = hx(0x4a3020); h[12, 33] = hx(0x4a3020)

def new_hair(draw_fn, pal):
    im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    draw_fn(d)
    return N.finish(im, pal)

def draw_parts():
    S = STYLES[STYLE]
    old = dict(N.PAL)
    N.PAL.update(S)
    try:
        P = N.draw_parts()
    finally:
        N.PAL.clear(); N.PAL.update(old)
    t, h = P['torso'], P['head']
    clean(t, S['hood'])
    plain_face(h)
    if STYLE == 'scream':
        # bare forearms with flame tattoos curling up them
        for nm in ('ffore', 'bfore'):
            a = P[nm]; recolor(a, S['hood'], SKIN); recolor(a, S['band'], SKIN)
            ys, xs = np.nonzero(solid_px(a))
            for y, x in zip(ys, xs):
                if (x * 2 + y) % 5 == 0: a[y, x] = hx(0x2a5ad8 if y % 3 else 0xff8a1a)
        put(t, [(x, 22) for x in range(30, 37)], S['hood'][2])               # tee collar
        for (x, y) in [(28, 28), (29, 27), (30, 28), (31, 27), (32, 28)]: put(t, [(x, y)], 0xd8221e)   # a red scrawl on the tee
        # thick black glasses
        for x in range(31, 40): h[12, x] = hx(0x0e0c12); h[14, x] = hx(0x0e0c12)
        for y in (12, 13, 14): h[y, 31] = hx(0x0e0c12); h[y, 35] = hx(0x0e0c12); h[y, 39] = hx(0x0e0c12)
        h[13, 32:35] = hx(0x6a7a8a); h[13, 36:39] = hx(0x6a7a8a); h[13, 37] = hx(0xffffff); h[13, 33] = hx(0x2a2630)
        h[16, 29] = hx(0xc8ccd4)
        def spikes(d):                                                        # short bleached spikes, darker at the roots
            d.polygon([(27, 13), (26, 9), (29, 6), (37, 6), (40, 9), (40, 11), (30, 11), (29, 14)], fill=hx(0xe8d890))
            for (bx, tx, ty) in [(27, 24, 3), (29, 28, 2), (31, 31, 1), (33, 34, 1), (35, 37, 2), (37, 40, 4), (39, 42, 7)]:
                d.polygon([(bx - 2, 8), (tx, ty), (bx + 2, 8)], fill=hx(0xe8d890))
        hair = new_hair(spikes, (0xfff6c8, 0xe8d890, 0xa89a50))
        hair[9:11][(hair[9:11, :, 3] > 0)] = hx(0x8a7a40)
        P['hair'] = hair
    elif STYLE == 'kilt':
        # sleeveless track top: bare arms; red stripes down the sides
        for nm in ('fupper', 'bupper', 'ffore', 'bfore'):
            a = P[nm]; recolor(a, S['hood'], SKIN)
        for y in range(23, 40): put(t, [(26, y), (40, y)], 0xd8221e)
        put(t, [(x, 22) for x in range(30, 37)], 0xa4a4b0); put(t, [(33, y) for y in range(23, 31)], 0xa4a4b0)   # collar and zip
        # the tartan kilt: the hem of the top and the thighs, red crossed with dark lines
        def tartan(a, y0=0):
            ys, xs = np.nonzero(solid_px(a))
            for y, x in zip(ys, xs):
                if y < y0: continue
                if x % 4 == 0 or y % 4 == 0: a[y, x] = hx(0x1e1418)
                elif x % 4 == 2 and y % 4 == 2: a[y, x] = hx(0xffd23a)
        for y in range(37, 42):
            for x in range(23, 44):
                if t[y, x, 3] and solid_px(t)[y, x]: t[y, x] = hx(S['pants'][1])
        tartan(t, 37)
        for nm in ('fthigh', 'bthigh'): tartan(P[nm])
        for nm in ('fshin', 'bshin'): recolor(P[nm], S['pants'], (0x3a3a40, 0x1e1e24, 0x0e0e12))   # knee socks
        def dreads(d):                                                        # long black dreads hanging past his shoulders
            d.polygon([(27, 13), (26, 8), (30, 5), (37, 5), (40, 8), (40, 11), (30, 10), (29, 14)], fill=hx(0x2a2228))
            for (x0, x1, y1) in [(27, 23, 30), (28, 25, 33), (29, 27, 31), (26, 22, 26), (30, 29, 24)]:   # down his back
                d.line([(x0, 9), (x1, y1)], fill=hx(0x2a2228), width=2)
            for (x0, x1, y1) in [(40, 42, 20), (41, 43, 17)]:                 # a couple hanging in front, beside his face
                d.line([(x0, 9), (x1, y1)], fill=hx(0x2a2228), width=2)
        hair = new_hair(dreads, (0x4a3e44, 0x2a2228, 0x140e12))
        hair[11:22, 31:40] = 0                                                # his face shows through
        P['hair'] = hair
        put(P['hair'], [(28, 14), (24, 24), (26, 28), (40, 18)], 0xd8221e)   # red beads
    elif STYLE == 'prophet':
        for y in range(22, 32):                                               # white shirt V
            w = max(1, 3 - (y - 22) // 3)
            put(t, [(x, y) for x in range(35 - w, 36 + w)], 0xf0f0f4)
        rng = np.random.RandomState(3)
        for nm in ('torso', 'fupper', 'bupper', 'ffore', 'bfore', 'fthigh', 'bthigh', 'fshin', 'bshin'):   # gold paisley over the suit
            a = P[nm]; ys, xs = np.nonzero(solid_px(a))
            for y, x in zip(ys, xs):
                if rng.rand() < 0.08 and not (34 <= x <= 37 and y < 32 and nm == 'torso'): a[y, x] = hx(0xe0a83a if rng.rand() < 0.7 else 0xfff0a8)
        # a big black beard over the jaw, the mouth showing through
        for y in range(16, 23):
            for x in range(31, 41):
                if h[y, x, 3] and not (y == 18 and 36 <= x <= 38): h[y, x] = hx(0x1e1618 if (x + y) % 3 else 0x3a2e30)
        def wild(d):                                                          # long wild hair, out to the sides and down the back
            d.ellipse([22, 1, 42, 18], fill=hx(0x1e1618))
            d.polygon([(23, 10), (19, 26), (25, 30), (29, 18)], fill=hx(0x1e1618))
            d.polygon([(40, 8), (44, 14), (42, 20), (40, 14)], fill=hx(0x1e1618))
        hair = new_hair(wild, (0x4a3e40, 0x1e1618, 0x0e0a0c))
        hair[11:18, 31:41] = 0                                                # the face shows through
        P['hair'] = hair
    elif STYLE == 'jumpsuit':
        # boiler suit: zip, barcode patch, belt
        put(t, [(34, y) for y in range(22, 40)], 0x7a220e)
        for y in range(25, 30):                                               # a white barcode patch
            for x in range(26, 33): put(t, [(x, y)], 0x0e0e12 if (26 <= y <= 28 and x in (27, 29, 30, 32)) else 0xffffff)
        put(t, [(x, 37) for x in range(25, 42)], 0x1e1e24); put(t, [(33, 37), (34, 37)], 0x8a929e)
        for nm in ('fshin', 'bshin'):                                         # boots up the shins
            a = P[nm]; ys, xs = np.nonzero(solid_px(a))
            for y, x in zip(ys, xs):
                if y >= 51: a[y, x] = hx(0x1e1e24)
        # the mask: pale, black eye holes, a stitched-shut mouth
        for y in range(9, 22):
            for x in range(29, 41):
                if h[y, x, 3] and solid_px(h)[y, x]: h[y, x] = hx(0xe8e0d0 if (x + y) % 5 else 0xd0c6b4)
        for (x, y) in [(33, 12), (33, 13), (34, 13), (36, 12), (37, 12), (36, 13), (37, 13), (38, 13)]: h[y, x] = hx(0x0e0c12)
        h[13, 37] = hx(0xff3a2a)                                              # something glinting behind it
        for x in range(34, 40): h[18, x] = hx(0x3a2e2a)
        for x in range(34, 40, 2): h[17, x] = hx(0x3a2e2a); h[19, x] = hx(0x3a2e2a)   # stitches
        put(h, [(38, 15), (39, 16)], 0x8a7a6a)
        def spikes(d):                                                        # black dreads spiking out of the mask's top
            d.polygon([(28, 11), (28, 8), (31, 6), (38, 6), (40, 9), (40, 10), (30, 10)], fill=hx(0x1e1a20))
            for (bx, tx, ty) in [(29, 24, 2), (31, 29, 0), (34, 34, 0), (36, 39, 1), (38, 43, 4), (30, 25, 7)]:
                d.line([(bx, 8), (tx, ty)], fill=hx(0x1e1a20), width=2)
        P['hair'] = new_hair(spikes, (0x3e3a42, 0x1e1a20, 0x0e0c10))
    return P

ORDER, RIG = N.ORDER, N.RIG
def composite(P, hide=('can',)): return N.composite(P, hide)

if __name__ == '__main__':
    import sys
    tiles = []
    for s in STYLES:
        set_style(s)
        c = composite(draw_parts())
        bg = Image.new('RGBA', (64, 64), (60, 70, 90, 255)); bg.alpha_composite(Image.fromarray(c)); tiles.append(bg)
    sheet = Image.new('RGBA', (64 * len(tiles), 64))
    for i, t in enumerate(tiles): sheet.paste(t, (i * 64, 0))
    sheet.resize((sheet.size[0] * 6, 384), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'nu_tribute.png')
