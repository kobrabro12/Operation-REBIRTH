"""NU's BLOCK BOSS costume: straight off the street. Same body, joints and rig as nu_draw.py (so every animation
in nu_moves.py plays on it), redrawn:

  - a red snapback worn backwards, black shades with a white glint
  - an oversized white tee with a big gold chain and an 'N' medallion
  - baggy blue jeans with a red bandana hanging out the back pocket, a gold watch
  - white high-tops with red swooshes and red laces
  - a gold mic on a red cord

  python3 tools/sprites/nu_street_draw.py preview.png
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw as N

PAL = {
    'hood': (0xffffff, 0xe8e8ec, 0xa8a8b4),          # the white tee
    'pants': (0x6a8ad0, 0x3e5a9e, 0x223a6a),         # blue denim
    'shoe': (0xffffff, 0xe6e8ee, 0x9aa0aa),
    'chrome': (0xfff0a8, 0xe0a83a, 0x8a5a14),        # gold
    'acid': (0xff6a5a, 0xd8221e, 0x8a0e0e),          # red accents
    'band': (0xfff0a8, 0xe0a83a, 0x8a5a14),          # gold watch / wristbands
}
OUT = 0x14101c
GOLD = (0xfff0a8, 0xe0a83a, 0x8a5a14)
hx = N.hx

def draw_parts():
    old = dict(N.PAL)
    N.PAL.update(PAL)
    try:
        P = N.draw_parts()
    finally:
        N.PAL.clear(); N.PAL.update(old)
    # ---- the tee: the NU print and drawstrings off, a gold chain and medallion on
    t = P['torso']; body = t[..., 3] > 0
    tee = hx(PAL['hood'][1])
    # (the NU print stays, in red - a streetwear logo)
    t[18:24][t[18:24, :, 3] > 0] = tee                                       # no hood bunched behind the neck: a tee collar
    t[23, 30:37][t[23, 30:37, 3] > 0] = hx(PAL['hood'][2])
    chain = [(29, 23), (29, 24), (30, 25), (30, 26), (31, 27), (32, 28), (33, 28), (34, 27), (35, 26), (35, 25), (36, 24), (36, 23)]
    for i, (x, y) in enumerate(chain): t[y, x] = hx(GOLD[0] if i % 2 else GOLD[1])
    for (x, y) in [(31, 29), (32, 29), (33, 29), (34, 29), (31, 30), (34, 30), (31, 31), (32, 31), (33, 31), (34, 31)]: t[y, x] = hx(GOLD[2])
    t[30, 32] = hx(GOLD[0]); t[30, 33] = hx(GOLD[1]); t[29, 32] = hx(0xffffff)   # the medallion and its shine
    for x in range(25, 42): t[40, x] = hx(PAL['pants'][1])                   # jeans showing at the hem
    t[41:44, 26:29] = hx(0xd8221e); t[43, 26] = 0; t[42, 25] = hx(0xd8221e)   # a red bandana out of the pocket
    t[41, 27] = hx(0xffffff)
    P['torso'] = t
    # ---- jeans: stitching, faded knees
    for nm in ('fthigh', 'bthigh', 'fshin', 'bshin'):
        a = P[nm]; ys, xs = np.nonzero(a[..., 3])
        if not len(xs): continue
        for y, x in zip(ys, xs):
            if (y * 3 + x) % 7 == 0 and tuple(a[y, x, :3]) == tuple(hx(PAL['pants'][1])[:3]): a[y, x] = hx(PAL['pants'][0])
    # ---- shoes: red swoosh and laces
    for nm, x0 in (('bshoe', 17), ('fshoe', 39)):
        a = P[nm]
        for i, x in enumerate(range(x0, x0 + 7)):
            y = 56 - (1 if 2 <= i <= 4 else 0)
            if a[y, x, 3]: a[y, x] = hx(0xd8221e)
        for x in range(x0 + 1, x0 + 5, 2):
            if a[54, x, 3]: a[54, x] = hx(0xd8221e)
        P[nm] = a
    # ---- head: shades instead of face paint
    h = P['head']
    h[12:15, 31:40][h[12:15, 31:40, 3] > 0] = hx(N.PAL['skin'][1])
    h[13, 31:40] = hx(0x0e0c12); h[14, 33:40] = hx(0x0e0c12); h[12, 33:40] = hx(0x0e0c12)
    h[13, 37] = hx(0xffffff); h[12, 38] = hx(0x6a6a7a)
    h[16, 29] = hx(GOLD[1])                                                 # gold earring
    P['head'] = h
    # ---- the backwards snapback (replaces the spiked hair)
    im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.pieslice([27, 4, 41, 18], 180, 360, fill=hx(0xd8221e))               # the crown
    d.rectangle([27, 10, 41, 11], fill=hx(0xd8221e))
    d.polygon([(28, 10), (21, 11), (21, 13), (29, 12)], fill=hx(0xa8141a))  # the brim, out the back
    cap = N.finish(im, (0xff6a5a, 0xd8221e, 0x8a0e0e))
    cap[8:10, 33:35] = hx(GOLD[1]); cap[8, 33] = hx(GOLD[0])                # a little gold logo
    cap[5, 34] = hx(0xa8141a)                                                # the button
    cap[12, 30:41] = hx(OUT) if True else cap[12, 30:41]
    P['hair'] = cap
    # ---- gold mic on a red cord
    m = P['mic']
    cord = np.all(m[..., :3] == np.array([0x24, 0x21, 0x2c]), -1) & (m[..., 3] > 0)
    m[cord] = hx(0xd8221e)
    m[17, 44:46] = hx(0xffffff)
    P['mic'] = m
    return P

ORDER, RIG = N.ORDER, N.RIG
def composite(P, hide=('can',)): return N.composite(P, hide)

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (40, 30, 50, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'nu_street.png')
