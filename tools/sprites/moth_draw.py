"""MADAME MOTH - the fortune teller. Her drawing, part by part on NU's joints (nu_draw.ORDER / RIG), animated by
trio_moves.py with the puppet rig.

An original design: a tall, poised fortune teller - pale skin, kohl-dark eyes, a lilac veil over her nose and mouth
hung with gold coins, plum-black hair in a high bun wrapped in a teal scarf, and two great feathery MOTH ANTENNAE
curling up out of it; a plum bodice laced in gold under a SHAWL OF MOTH WINGS (dusty tan, banded, an eye-spot on each
side) draped over her shoulders; long sleeves that bell at the cuff, gold bangles; a long plum skirt with a scalloped
moth-wing hem (each leg carries its own panel, so the skirt splits when she strides); pointed plum shoes. In her front
hand, a fan of three tarot cards (NU's `mic` slot).

Every part is a 64x64 layer facing right, feet on row 58, shaded with nu_draw.shade5. draw_parts() returns
{name: RGBA array}.
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import blank, shade5, put, limb, hx, ORDER, RIG, composite   # noqa: F401

VARIANT = 'default'
PLUM = (0xd27ab8, 0xa8489a, 0x74286e, 0x4c164a, 0x1e0820)
WING = (0xfaecc0, 0xe2c896, 0xbc9a6c, 0x846244, 0x2a1a10)
SKIN = (0xfff4f0, 0xf6dcd6, 0xe0bcb6, 0xb08890, 0x3a2030)
HAIR = (0x5a3a62, 0x3e2448, 0x2a1634, 0x1a0c22, 0x0c040e)
TEAL = (0x7ad8c8, 0x3aa898, 0x1e7a70, 0x10524c, 0x062420)
VEIL = (0xfff0ff, 0xf0d8f8, 0xd8b8ec, 0xa888c8, 0x3a2050)
GOLD = (0xfff4b0, 0xf8d460, 0xd8a030, 0x9a6810, 0x3a2408)
CARD = (0xfffaf0, 0xf4ecd8, 0xe6d8b8, 0xb4a280, 0x2a2018)

VARIANTS = {
    'default': {},
    'luna': {'PLUM': (0x9ad0ff, 0x5a90d8, 0x2e58a8, 0x1a3470, 0x0a1430), 'WING': (0xeaffe0, 0xbcf0b0, 0x84d48a, 0x4a9a5a, 0x14301c),
             'TEAL': (0xfff0a0, 0xf0c850, 0xc89020, 0x8a5a10, 0x2a1a04)},
    'deathshead': {'PLUM': (0x6a6a72, 0x46464e, 0x2a2a32, 0x18181e, 0x060608), 'WING': (0xfff0a0, 0xe8c050, 0xb88a28, 0x7a5410, 0x241804),
                   'VEIL': (0xffffff, 0xe8e8ec, 0xc8c8d0, 0x9090a0, 0x202028)},
}

def R(name):
    """A ramp, swapped for the current costume's if it has one."""
    return VARIANTS.get(VARIANT, {}).get(name, globals()[name])

def over(a, b):
    """Lays layer b's pixels onto a."""
    m = b[..., 3] > 0; a[m] = b[m]; return a

def setp(a, pts, c):
    """Sets pixels whether or not the layer has anything there."""
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64: a[y, x] = hx(c)

def draw_parts():
    """MADAME MOTH, part by part (see the top of the file)."""
    PL, WG, SK, HR, TL, VL, GO, CD = (R(n) for n in ('PLUM', 'WING', 'SKIN', 'HAIR', 'TEAL', 'VEIL', 'GOLD', 'CARD'))
    P = {}
    # ---------------- legs: each carries its own skirt panel; the shin ends in a scalloped moth-wing hem, then a pointed shoe
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 54)), ('f', (37, 40), (40, 48), (40, 54))):
        im = blank(); d = ImageDraw.Draw(im)
        d.polygon([(hip[0] - 6, hip[1] - 1), (hip[0] + 6, hip[1] - 1), (knee[0] + 7, knee[1] + 1), (knee[0] - 7, knee[1] + 1)], fill=hx(PL[2]))
        a = shade5(im, PL); put(a, [(knee[0] + (2 if side == 'f' else -2), y) for y in range(hip[1] + 2, knee[1])], PL[3])   # a fold
        P[side + 'thigh'] = a
        im = blank(); d = ImageDraw.Draw(im)
        d.polygon([(knee[0] - 7, knee[1] - 1), (knee[0] + 7, knee[1] - 1), (ank[0] + 8, ank[1] - 1), (ank[0] - 8, ank[1] - 1)], fill=hx(PL[2]))
        a = shade5(im, PL)
        hem = blank(); dh = ImageDraw.Draw(hem)
        for k in range(4): dh.ellipse([ank[0] - 9 + k * 4, ank[1] - 4, ank[0] - 5 + k * 4, ank[1]], fill=hx(WG[2]))   # the scalloped wing hem
        over(a, shade5(hem, WG)); put(a, [(ank[0] - 7, ank[1] - 2), (ank[0] - 3, ank[1] - 2), (ank[0] + 1, ank[1] - 2), (ank[0] + 5, ank[1] - 2)], WG[3])
        P[side + 'shin'] = a
        im = blank(); d = ImageDraw.Draw(im); x0 = ank[0] - 2
        d.polygon([(x0, 55), (x0 + 5, 55), (x0 + 9, 57), (x0 + 9, 58), (x0, 58)], fill=hx(PL[3]))
        a = shade5(im, (PL[1], PL[2], PL[3], PL[4], PL[4])); setp(a, [(x0 + 1, 55)], GO[2])
        P[side + 'shoe'] = a
    # ---------------- back arm: a belled plum sleeve, gold bangles, a pale hand
    im = blank(); d = ImageDraw.Draw(im); limb(d, (27, 24), (25, 31), 4, hx(PL[2])); P['bupper'] = shade5(im, PL)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (25, 31), (26, 35), 4, hx(PL[2])); d.polygon([(22, 33), (29, 33), (30, 37), (21, 37)], fill=hx(PL[2])); a = shade5(im, PL)
    put(a, [(x, 37) for x in range(21, 31)], GO[2])
    h = blank(); dh = ImageDraw.Draw(h); dh.ellipse([24, 37, 28, 41], fill=hx(SK[2])); over(a, shade5(h, SK))
    P['bfore'] = a
    # ---------------- torso: the plum bodice laced in gold, the shawl of moth wings over her shoulders, eye-spots
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(29, 21), (37, 21), (39, 24), (38, 31), (37, 36), (39, 41), (27, 41), (29, 36), (28, 31), (27, 24)], fill=hx(PL[2]))
    a = shade5(im, PL)
    for y in range(26, 37, 2): put(a, [(32, y), (34, y + 1)], GO[2]); put(a, [(33, y)], GO[1])            # gold lacing
    put(a, [(x, 40) for x in range(27, 40)], GO[3]); put(a, [(32, 21), (33, 21), (34, 21)], SK[2])
    sh = blank(); ds = ImageDraw.Draw(sh)                                                                    # the shawl of moth wings
    ds.polygon([(30, 21), (24, 17), (17, 11), (12, 11), (10, 15), (11, 22), (14, 29), (18, 34), (23, 35), (27, 31), (29, 26)], fill=hx(WG[2]))   # the wing, raised behind her shoulder
    ds.polygon([(33, 20), (39, 21), (43, 24), (43, 29), (40, 30), (38, 26), (34, 24)], fill=hx(WG[2]))                                    # the shawl's end over her front shoulder
    s = shade5(sh, WG)
    for (x, y) in [(11, 14), (11, 15), (11, 16), (12, 19), (12, 20), (13, 23), (14, 26), (15, 29), (17, 32), (20, 34), (22, 34), (12, 12), (14, 11), (16, 11)]:   # the dark outer band
        put(s, [(x, y), (x + 1, y)], WG[3])
    cx, cy = 19, 21                                                                                          # the eye-spot: dark ring, orange, a white glint
    for (x, y) in [(cx + i, cy + j) for i in range(-3, 4) for j in range(-3, 4) if 6 <= i * i + j * j <= 10]: put(s, [(x, y)], HR[3])
    for (x, y) in [(cx + i, cy + j) for i in range(-2, 3) for j in range(-2, 3) if i * i + j * j <= 4]: put(s, [(x, y)], 0xe88a3a)
    put(s, [(cx, cy), (cx - 1, cy)], HR[3]); put(s, [(cx - 1, cy - 1)], 0xffffff)
    for k, y in enumerate((27, 30)): put(s, [(x, y + (x % 2)) for x in range(15 + k * 2, 27)], WG[1])    # pale bands below it
    put(s, [(41, 25), (41, 26), (40, 27)], HR[3]); put(s, [(41, 25)], WG[0])
    put(s, [(x, 22) for x in range(28, 39)], WG[1])
    over(a, s)
    P['torso'] = a
    # ---------------- head: pale, kohl-dark eyes over a lilac veil hung with coins
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([32, 17, 34, 21], fill=hx(SK[2]))
    d.polygon([(31, 9), (37, 9), (38, 12), (39, 15), (38, 17), (36, 19), (33, 19), (31, 17)], fill=hx(SK[2]))
    a = shade5(im, SK)
    put(a, [(35, 12), (36, 12), (37, 12)], HR[4]); put(a, [(36, 13)], 0x6a2a7a); put(a, [(37, 13)], HR[4]); put(a, [(34, 11), (35, 11)], HR[3])   # a kohl-dark eye, half lidded
    v = blank(); dv = ImageDraw.Draw(v); dv.polygon([(34, 15), (39, 15), (40, 17), (37, 20), (34, 20)], fill=hx(VL[2])); vv = shade5(v, VL)
    over(a, vv); setp(a, [(34, 20), (36, 20), (38, 19)], GO[1]); setp(a, [(35, 21), (37, 20)], GO[2])      # the coins on the veil
    P['head'] = a
    # ---------------- hair: a high bun in a teal scarf, coins on her brow, two feathery moth antennae
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(30, 14), (29, 9), (31, 7), (37, 6), (40, 9), (39, 11), (34, 10), (32, 12), (31, 15)], fill=hx(HR[2]))
    d.ellipse([25, 2, 33, 9], fill=hx(HR[2]))
    a = shade5(im, HR)
    sc = blank(); ds = ImageDraw.Draw(sc); ds.polygon([(30, 8), (40, 8), (40, 10), (30, 11)], fill=hx(TL[2])); ds.polygon([(24, 6), (30, 7), (29, 10), (25, 9)], fill=hx(TL[2]))
    over(a, shade5(sc, TL))
    setp(a, [(32, 11), (34, 11), (36, 11), (38, 11)], GO[1])                                                  # coins on her brow
    for (bx, by, ex, ey) in ((36, 7, 44, 0), (34, 7, 30, -1)):                                                 # the antennae: a stem, feathery barbs
        n = 8
        for i in range(n + 1):
            f = i / n; x = int(round(bx + (ex - bx) * f + (2 * (1 - f) * f) * (3 if ex > bx else -3))); y = int(round(by + (ey - by) * f))
            setp(a, [(x, y)], WG[3])
            if 2 <= i <= n - 1: setp(a, [(x - 1, y - 1), (x + 1, y - 1), (x - 2, y - 2), (x + 2, y - 2)], WG[1] if i % 2 else WG[2])
    P['hair'] = a
    # ---------------- front arm: sleeve, bell cuff with bangles, hand; the tarot cards (mic slot) and the fist
    im = blank(); d = ImageDraw.Draw(im); limb(d, (38, 24), (42, 31), 4, hx(PL[2])); P['fupper'] = shade5(im, PL)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (42, 31), (44, 28), 4, hx(PL[2])); d.polygon([(40, 28), (47, 27), (48, 31), (42, 32)], fill=hx(PL[2])); a = shade5(im, PL)
    put(a, [(41, 28), (42, 28), (43, 28), (44, 28), (45, 28), (46, 28)], GO[2]); put(a, [(43, 28)], GO[0])
    P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    cards = blank_arr()
    for k, (dx, ang) in enumerate(((-3, -18), (0, 0), (3, 18))):                                              # three cards fanned
        c = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); dc = ImageDraw.Draw(c)
        dc.rectangle([45 + dx, 17, 50 + dx, 25], fill=hx(CD[2]))
        cc = shade5(c, CD)
        put(cc, [(47 + dx, 19), (48 + dx, 20), (47 + dx, 21), (48 + dx, 22), (47 + dx, 23)], PL[2] if k != 1 else GO[2])
        put(cc, [(x, 17) for x in range(45 + dx, 51 + dx)], GO[2])
        rot = Image.fromarray(cc).rotate(-ang, center=(44, 26), resample=Image.NEAREST)
        over(cards, np.array(rot))
    P['mic'] = cards
    im = blank(); d = ImageDraw.Draw(im); d.ellipse([42, 23, 46, 28], fill=hx(SK[2])); a = shade5(im, SK); put(a, [(43, 25), (44, 25)], SK[3]); P['ffist'] = a
    P['can'] = blank_arr()
    return P

def blank_arr(): return np.zeros((64, 64, 4), np.uint8)

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (60, 70, 110, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((512, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'moth_preview.png')
