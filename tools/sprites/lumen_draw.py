"""LUMEN - the star's last light. Her drawing, part by part on NU's joints (nu_draw.ORDER / RIG), animated by
trio_moves.py with the puppet rig.

An original design: a slight figure in a deep-indigo hood whose point streams back like a comet's tail, a face that
is a cracked violet crystal with one star for an eye (no mouth), three gold shard-points floating over her hood like a
broken crown, a short night-sky robe with tiny stars and a gold star-buckled belt, the HEART SHARD glowing in her
chest, sleeves that flare at the cuff over hands made of pale light, dark tights and pointed gold-tipped boots, and a
silver staff topped with a gold crescent cradling a star (in NU's `mic` slot).

Every part is a 64x64 layer facing right, feet on row 58, shaded with nu_draw.shade5 (5-tone ramps: highlight, light,
base, shadow, outline). draw_parts() returns {name: RGBA array}.
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import blank, shade5, put, limb, hx, ORDER, RIG, composite   # noqa: F401  (ORDER / RIG / composite: the rig uses them)

VARIANT = 'default'
# 5-tone ramps: highlight, light, base, shadow, outline
NIGHT = (0x6a5ac8, 0x4a3c9e, 0x2e2470, 0x1e174e, 0x0c0822)       # the robe and hood
CRYST = (0xffffff, 0xf0d8ff, 0xc89af8, 0x8a5ae0, 0x2b1569)       # her crystal face
LIGHT = (0xffffff, 0xf8f0ff, 0xe4d4ff, 0xb49ae8, 0x3a2a6a)       # her hands of light
TIGHT = (0x4a3e78, 0x34295c, 0x241c44, 0x16102e, 0x0a0618)       # tights
GOLD = (0xfff4b0, 0xf8d460, 0xd8a030, 0x9a6810, 0x3a2408)
SILVER = (0xffffff, 0xe0e6f4, 0xb0bad0, 0x707a94, 0x22283a)
STAR_W, STAR_V, SHARD = 0xffffff, 0xd6a0ff, 0xa862ff

# costumes: palette swaps of the five ramps (name -> ramps); the game's skins.js lists the same names
VARIANTS = {
    'default': {},
    'dawn': {'NIGHT': (0xffd0a0, 0xf8a070, 0xe0704a, 0xa8443a, 0x401418), 'CRYST': (0xffffff, 0xfff0c8, 0xffd070, 0xe09030, 0x5a2808),
             'TIGHT': (0x8a4a5a, 0x6a3448, 0x4a2434, 0x2e1420, 0x140810)},
    'void': {'NIGHT': (0x3a3a48, 0x26262f, 0x16161c, 0x0c0c10, 0x000000), 'CRYST': (0xffffff, 0xffd0e0, 0xff6a8a, 0xc0244a, 0x3a0010),
             'GOLD': (0xffffff, 0xd8d8e8, 0xa0a0b8, 0x60607a, 0x1a1a28)},
}

def R(name):
    """A ramp, swapped for the current costume's if it has one."""
    return VARIANTS.get(VARIANT, {}).get(name, globals()[name])

def over(a, b):
    """Lays layer b's pixels onto a."""
    m = b[..., 3] > 0; a[m] = b[m]; return a

def setp(a, pts, c):
    """Sets pixels whether or not the layer has anything there (put() only paints over existing pixels)."""
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64: a[y, x] = hx(c)

def star(a, x, y, c=STAR_W, arm=1):
    """A little four-point star of pixels."""
    setp(a, [(x, y)], c)
    for d in range(1, arm + 1): setp(a, [(x + d, y), (x - d, y), (x, y + d), (x, y - d)], c)

def draw_parts():
    """LUMEN, part by part (see the top of the file)."""
    NI, CR, LI, TI, GO, SI = (R(n) for n in ('NIGHT', 'CRYST', 'LIGHT', 'TIGHT', 'GOLD', 'SILVER'))
    P = {}
    # ---------------- legs: slim dark tights, pointed boots with gold toes and cuffs
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 54)), ('f', (37, 40), (40, 48), (40, 54))):
        im = blank(); d = ImageDraw.Draw(im); limb(d, hip, knee, 4, hx(TI[2])); P[side + 'thigh'] = shade5(im, TI)
        im = blank(); d = ImageDraw.Draw(im); limb(d, knee, ank, 4, hx(TI[2])); P[side + 'shin'] = shade5(im, TI)
        im = blank(); d = ImageDraw.Draw(im); x0 = ank[0] - 3
        d.polygon([(x0, 53), (x0 + 5, 53), (x0 + 6, 55), (x0 + 10, 57), (x0 + 10, 58), (x0, 58)], fill=hx(NI[2]))
        a = shade5(im, NI)
        put(a, [(x0 + 8, 57), (x0 + 9, 57), (x0 + 10, 57), (x0 + 10, 58)], GO[1]); put(a, [(x0 + 9, 58)], GO[2])    # gold toe
        put(a, [(x, 53) for x in range(x0, x0 + 5)], GO[2]); put(a, [(x0 + 1, 53)], GO[0])                        # gold cuff
        put(a, [(x, 58) for x in range(x0, x0 + 8)], NI[4])
        P[side + 'shoe'] = a
    # ---------------- back arm: a flared sleeve, a hand of light
    im = blank(); d = ImageDraw.Draw(im); limb(d, (27, 24), (25, 31), 4, hx(NI[2])); P['bupper'] = shade5(im, NI)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (25, 31), (26, 35), 4, hx(NI[2]))
    d.polygon([(23, 34), (29, 34), (30, 37), (22, 37)], fill=hx(NI[2])); a = shade5(im, NI)       # the flared cuff
    put(a, [(x, 37) for x in range(22, 31)], GO[2])
    h = blank(); dh = ImageDraw.Draw(h); dh.ellipse([24, 37, 28, 41], fill=hx(LI[2])); over(a, shade5(h, LI))
    P['bfore'] = a
    # ---------------- torso: the night-sky robe, gold belt with a star buckle, the HEART SHARD; a short flared hem
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(29, 21), (37, 21), (39, 24), (38, 32), (39, 38), (41, 46), (36, 47), (33, 45), (30, 47), (25, 46), (27, 38), (28, 31), (27, 24)], fill=hx(NI[2]))
    a = shade5(im, NI)
    for (x, y) in [(30, 26), (36, 29), (29, 34), (37, 41), (31, 43), (27, 44), (34, 37)]: put(a, [(x, y)], STAR_W if (x + y) % 3 else STAR_V)   # tiny stars
    put(a, [(x, 38) for x in range(27, 40)], GO[2]); put(a, [(x, 39) for x in range(27, 40)], GO[3])                                # the belt
    star(a, 33, 38, GO[0]); put(a, [(33, 38)], STAR_W)
    put(a, [(x, 46) for x in range(25, 41)] + [(41, 45)], GO[2])                                                                    # gold hem
    put(a, [(32, 21), (33, 21), (34, 21)], NI[1])
    # the heart shard: a glowing violet diamond with a white core
    for (x, y, c) in [(33, 25, CR[2]), (32, 26, CR[2]), (34, 26, CR[2]), (33, 26, STAR_W), (32, 27, CR[3]), (33, 27, CR[1]), (34, 27, CR[2]), (33, 28, CR[3])]: put(a, [(x, y)], c)
    P['torso'] = a
    # ---------------- head: a cracked violet crystal face with one star for an eye
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(32, 10), (37, 9), (40, 12), (40, 16), (38, 19), (34, 20), (31, 18), (31, 12)], fill=hx(CR[2]))
    a = shade5(im, CR)
    put(a, [(33, 11), (34, 12), (35, 14), (35, 15), (36, 17)], CR[3]); put(a, [(39, 13), (38, 14)], CR[3])   # facet lines / cracks
    star(a, 37, 14, STAR_W, 1); put(a, [(38, 13), (36, 15), (38, 15), (36, 13)], CR[1])               # the star eye
    put(a, [(32, 11), (33, 10)], CR[0])
    P['head'] = a
    # ---------------- hair = the HOOD: deep indigo round her face, its point streaming back like a comet; the crown of shards
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(30, 18), (29, 12), (31, 8), (36, 6), (41, 8), (42, 11), (39, 10), (35, 9), (32, 11), (32, 18)], fill=hx(NI[2]))   # round the face
    d.polygon([(30, 9), (24, 7), (16, 8), (10, 11), (18, 11), (25, 12), (29, 14)], fill=hx(NI[2]))                               # the comet tail
    a = shade5(im, NI)
    for (x, y) in [(14, 10), (19, 9), (23, 10), (27, 9), (36, 7)]: put(a, [(x, y)], STAR_W)
    put(a, [(x, 11) for x in range(11, 17)], STAR_V)
    put(a, [(32, y) for y in range(11, 18)] + [(33, 10), (34, 9), (35, 9), (36, 8), (37, 8), (38, 9), (39, 9), (40, 10)], GO[2])   # gold trim round the face
    for (cx, cy, c) in [(31, 4, GO[1]), (36, 2, STAR_W), (41, 4, GO[1])]:                                                        # three floating shard points
        setp(a, [(cx, cy - 2), (cx - 1, cy - 1), (cx, cy - 1), (cx + 1, cy - 1), (cx - 1, cy), (cx + 1, cy), (cx, cy + 1)], GO[3]); setp(a, [(cx, cy)], c); setp(a, [(cx, cy - 1)], STAR_W)
    P['hair'] = a
    # ---------------- front arm: sleeve, flared cuff, hand of light; the staff (mic slot) and the fist round it
    im = blank(); d = ImageDraw.Draw(im); limb(d, (38, 24), (42, 31), 4, hx(NI[2])); P['fupper'] = shade5(im, NI)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (42, 31), (44, 28), 4, hx(NI[2]))
    d.polygon([(41, 27), (47, 27), (47, 30), (42, 31)], fill=hx(NI[2])); a = shade5(im, NI)
    put(a, [(41, 27), (42, 27), (43, 27), (44, 27), (45, 27), (46, 27)], GO[2])
    P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.line([(46, 9), (43, 42)], fill=hx(SI[2]), width=2)
    a = shade5(im, SI)
    cres = blank(); dc = ImageDraw.Draw(cres)                                                                                        # the crescent cradling a star
    dc.ellipse([42, 1, 52, 11], fill=hx(GO[2])); dc.ellipse([44, -1, 54, 8], fill=(0, 0, 0, 0))
    over(a, shade5(cres, GO))
    star(a, 47, 4, STAR_W, 2); put(a, [(47, 4)], STAR_W)
    put(a, [(43, 41), (43, 42)], GO[2]); put(a, [(45, 20), (45, 21)], GO[2])
    P['mic'] = a
    im = blank(); d = ImageDraw.Draw(im); d.ellipse([42, 23, 46, 28], fill=hx(LI[2])); a = shade5(im, LI); put(a, [(43, 24)], LI[0]); P['ffist'] = a
    P['can'] = blank_arr()
    return P

def blank_arr(): return np.zeros((64, 64, 4), np.uint8)

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (60, 70, 110, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((512, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'lumen_preview.png')
