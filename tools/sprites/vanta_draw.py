"""VANTA - the neon street samurai. His drawing, part by part on NU's joints (nu_draw.ORDER / RIG), animated by
trio_moves.py with the puppet rig.

An original design in GNASH's family (black clothes outlined in neon - gnash_draw.py's `outlined()` idea): a smooth
black helmet with one glowing visor slit and two swept-back neon fins (NU's `hair` slot, with a neon scarf streaming
behind); a high-collared black techwear jacket with a neon seam down the zip, a glowing core ring on the chest and a
split coat-tail; a long black scabbard slung across his back; strapped cargo trousers with neon bands, black boots with
glowing soles; TWO neon katanas, both held in a REVERSE GRIP - the short wrapped hilt rises out of the top of the fist,
the black guard under it, the blade (white-hot core, coloured edge) runs down out of the bottom: one in his front hand
(the `mic` slot, in the look's blade colour) and its twin in his back hand (`bsword`, a part of his own on the back
forearm - ORDER / RIG below - in the look's accent colour).

Every part is a 64x64 layer facing right, feet on row 58, shaded with nu_draw.shade5 (5-tone ramps: highlight, light,
base, shadow, outline - an `outlined()` ramp's outline is its neon). draw_parts() returns {name: RGBA array}.
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import blank, shade5, put, limb, hx, ORDER as NU_ORDER, RIG as NU_RIG

# NU's joints plus `bsword`: the second katana, held in his back fist (drawn under the glove, so the fist grips it)
ORDER = [n for n in NU_ORDER]; ORDER.insert(ORDER.index('bfore'), 'bsword')
RIG = {**NU_RIG, 'bsword': ((26, 37), 'bfore')}

def composite(P, hide=('can',)):
    """All his parts layered in ORDER (for previews and the rig's base picture)."""
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide or n not in P: continue
        a = P[n]; m = a[..., 3] > 0
        out[m] = a[m]
    return out

VARIANT = 'default'

def outlined(neon, lift=0):
    """A black material whose outline glows `neon`."""
    return (0x4a4a5c + lift, 0x2e2e3c + lift, 0x1c1c26 + lift, 0x101016, neon)

# each look: the outline neon, the visor / blade neon, the accent (scarf, soles, core) - and whether the jacket is chrome
LOOKS = {
    'default': {'neon': 0x3af0ff, 'visor': 0xff2ad8, 'accent': 0xff2ad8, 'blade': 0x3af0ff},
    'redline': {'neon': 0xff3a2a, 'visor': 0xffc83a, 'accent': 0xffc83a, 'blade': 0xff5a2a},       # REDLINE: overheated red, amber visor
    'glitch': {'neon': 0xb06aff, 'visor': 0x6affb0, 'accent': 0x6affb0, 'blade': 0xd8b8ff, 'chrome': True},   # GLITCHWAVE: chrome jacket, violet + mint
}
VARIANTS = {k: {} for k in LOOKS}

def L():
    """The current look."""
    return LOOKS.get(VARIANT, LOOKS['default'])

def glow(c):
    """A 5-tone ramp of solid light in colour c (white-hot highlight)."""
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    mixw = lambda k: (int(r + (255 - r) * k) << 16) | (int(g + (255 - g) * k) << 8) | int(b + (255 - b) * k)
    dark = lambda k: (int(r * k) << 16) | (int(g * k) << 8) | int(b * k)
    return (0xffffff, mixw(0.45), c, dark(0.6), dark(0.25))

def cloth():
    """The jacket / trousers ramp (black with a neon outline, or chrome for GLITCHWAVE)."""
    lk = L()
    if lk.get('chrome'): return (0xffffff, 0xd8dce8, 0xa8aec0, 0x6a7088, lk['neon'])
    return outlined(lk['neon'])

def over(a, b):
    """Lays layer b's pixels onto a."""
    m = b[..., 3] > 0; a[m] = b[m]; return a

def setp(a, pts, c):
    """Sets pixels whether or not the layer has anything there (put() only paints over existing pixels)."""
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64: a[y, x] = hx(c)

def line(a, p0, p1, c):
    """A one-pixel line of new pixels."""
    (x0, y0), (x1, y1) = p0, p1; n = max(abs(x1 - x0), abs(y1 - y0), 1)
    setp(a, [(int(round(x0 + (x1 - x0) * i / n)), int(round(y0 + (y1 - y0) * i / n))) for i in range(n + 1)], c)

def draw_parts():
    """VANTA, part by part (see the top of the file)."""
    lk = L(); CL = cloth(); NE, VI, AC, BL = lk['neon'], lk['visor'], lk['accent'], lk['blade']
    BLACK = outlined(NE)
    P = {}
    # ---------------- legs: strapped cargo trousers, a neon band at the knee, black boots with glowing soles
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 54)), ('f', (37, 40), (40, 48), (40, 54))):
        im = blank(); d = ImageDraw.Draw(im); limb(d, hip, knee, 5, hx(CL[2])); a = shade5(im, CL)
        put(a, [(knee[0] - 2, knee[1] - 3), (knee[0] - 1, knee[1] - 3), (knee[0], knee[1] - 3), (knee[0] + 1, knee[1] - 3)], AC)   # a strap
        P[side + 'thigh'] = a
        im = blank(); d = ImageDraw.Draw(im); limb(d, knee, ank, 4, hx(CL[2])); a = shade5(im, CL)
        put(a, [(knee[0] + dx, knee[1] + 1) for dx in (-1, 0, 1)], NE)
        P[side + 'shin'] = a
        im = blank(); d = ImageDraw.Draw(im); x0 = ank[0] - 3
        d.polygon([(x0, 52), (x0 + 6, 52), (x0 + 7, 55), (x0 + 10, 56), (x0 + 10, 58), (x0, 58)], fill=hx(BLACK[2]))
        a = shade5(im, BLACK)
        setp(a, [(x, 58) for x in range(x0, x0 + 11)], AC); setp(a, [(x0 + 8, 57), (x0 + 9, 57)], AC)            # glowing sole
        put(a, [(x0 + 1, 53), (x0 + 2, 53)], NE)
        P[side + 'shoe'] = a
    # ---------------- back arm: sleeve, a black glove with a neon knuckle line
    im = blank(); d = ImageDraw.Draw(im); limb(d, (27, 24), (25, 31), 4, hx(CL[2])); P['bupper'] = shade5(im, CL)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (25, 31), (26, 36), 4, hx(CL[2])); a = shade5(im, CL)
    g = blank(); dg = ImageDraw.Draw(g); dg.ellipse([24, 35, 28, 40], fill=hx(BLACK[2])); over(a, shade5(g, BLACK)); put(a, [(25, 36), (26, 36), (27, 36)], NE)
    P['bfore'] = a
    # ---------------- torso: the scabbard across his back, the high-collared jacket, the zip seam, the core ring, coat-tails
    a = blank_arr()
    sc = blank(); ds = ImageDraw.Draw(sc); ds.line([(22, 16), (34, 44)], fill=hx(BLACK[2]), width=3); s = shade5(sc, BLACK)    # the scabbard
    setp(s, [(23, 17), (24, 18)], AC); setp(s, [(33, 43), (34, 44)], AC); line(s, (25, 22), (31, 37), NE)                     # its neon trim
    over(a, s)
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(28, 17), (38, 17), (39, 22), (38, 30), (39, 40), (41, 46), (37, 44), (33, 42), (29, 44), (25, 46), (27, 40), (28, 30), (27, 22)], fill=hx(CL[2]))
    j = shade5(im, CL)
    put(j, [(33, y) for y in range(20, 41)], NE); put(j, [(34, y) for y in range(22, 40, 3)], NE)                            # the zip seam
    for (x, y) in [(31, 26), (32, 25), (33, 25), (34, 25), (35, 26), (35, 27), (34, 28), (33, 28), (32, 28), (31, 27)]: put(j, [(x, y)], AC)   # the core ring
    put(j, [(33, 26), (33, 27)], 0xffffff)
    put(j, [(x, 38) for x in range(27, 40)], CL[4]); put(j, [(30, 38), (36, 38)], AC)                                           # belt + buckles
    over(a, j)
    P['torso'] = a
    # ---------------- head: a smooth black helmet, one glowing visor slit, a chin guard
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(31, 9), (36, 7), (40, 9), (41, 13), (40, 18), (37, 20), (33, 20), (30, 17), (30, 12)], fill=hx(BLACK[2]))
    a = shade5(im, BLACK)
    V = glow(VI)
    for x in range(33, 42): put(a, [(x, 13)], V[2]); put(a, [(x, 14)], V[3])
    put(a, [(38, 13), (39, 13)], V[0]); put(a, [(37, 13), (40, 13)], V[1])                                                    # the slit, white-hot where he looks
    put(a, [(33, 10), (34, 9)], BLACK[0]); put(a, [(38, 18), (39, 17), (36, 19)], NE)                                         # a shine, the chin guard's seam
    P['head'] = a
    # ---------------- hair = two swept-back neon fins + the scarf streaming behind
    a = blank_arr(); F = glow(NE)
    for (bx, by, ex, ey, w) in ((33, 9, 22, 3, 3), (34, 11, 24, 8, 2)):
        im = blank(); d = ImageDraw.Draw(im); d.polygon([(bx, by - w // 2), (bx + 1, by + w // 2 + 1), (ex, ey)], fill=hx(F[2])); over(a, shade5(im, F))
        line(a, (bx, by), (ex + 1, ey), F[0])
    S = glow(AC); im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(31, 18), (25, 17), (19, 18), (13, 16), (15, 18), (20, 20), (26, 20), (31, 20)], fill=hx(S[2]))                # the scarf: two ribbons
    d.polygon([(30, 20), (24, 21), (19, 24), (16, 24), (19, 22), (24, 19)], fill=hx(S[2]))
    over(a, shade5(im, S))
    setp(a, [(x, 18) for x in range(16, 29, 3)], S[1])
    P['hair'] = a
    # ---------------- front arm: sleeve and glove; the katana (mic slot) and the fist round its hilt
    im = blank(); d = ImageDraw.Draw(im); limb(d, (38, 24), (42, 31), 4, hx(CL[2])); P['fupper'] = shade5(im, CL)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (42, 31), (44, 28), 4, hx(CL[2])); a = shade5(im, CL); put(a, [(42, 29), (43, 29)], NE); P['ffore'] = a
    P['mic'] = katana((44, 26), glow(BL), BLACK, NE)                                                                     # the katana, reverse grip
    P['bsword'] = katana((26, 37), glow(AC), BLACK, NE)                                                                    # its twin, in his back fist
    im = blank(); d = ImageDraw.Draw(im); d.ellipse([42, 23, 46, 28], fill=hx(BLACK[2])); a = shade5(im, BLACK); put(a, [(43, 24), (44, 24)], NE); P['ffist'] = a
    P['can'] = blank_arr()
    return P

def blank_arr(): return np.zeros((64, 64, 4), np.uint8)

def katana(fist, B, BLACK, NE):
    """A reverse-grip katana for the fist at `fist`: hilt + pommel up out of the top, guard under it, the blade (ramp B:
    white-hot core, coloured edge, white tip) running down and back out of the bottom."""
    fx, fy = fist; k = blank_arr()
    line(k, (fx, fy - 2), (fx + 1, fy - 8), BLACK[1]); setp(k, [(fx, fy - 4), (fx + 1, fy - 6)], B[2]); setp(k, [(fx + 1, fy - 9), (fx + 2, fy - 9)], BLACK[3]); setp(k, [(fx + 1, fy - 9)], NE)
    for (dx, dy) in [(-2, 3), (-1, 3), (0, 3), (1, 3), (-1, 4), (0, 4)]: setp(k, [(fx + dx, fy + dy)], BLACK[3])
    setp(k, [(fx - 1, fy + 3)], B[2])
    x0, y0, x1, y1 = fx - 1, fy + 5, fx - 15, fy + 23
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(n + 1):
        x = int(round(x0 + (x1 - x0) * i / n)); y = int(round(y0 + (y1 - y0) * i / n))
        setp(k, [(x, y + 1)], B[3]); setp(k, [(x + 1, y)], B[2]); setp(k, [(x, y)], B[0] if i > 3 else B[1])
    setp(k, [(x1, y1), (x1 - 1, y1 + 1)], 0xffffff)
    return k

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (24, 20, 40, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((512, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'vanta_preview.png')
