"""KAMI - the paper fighter. His drawing, part by part on NU's joints (nu_draw.ORDER / RIG), animated by
trio_moves.py with the puppet rig.

An original design: a little person folded out of one sheet of white paper - every part angular, with crisp crease
lines; a head folded like a diamond with two round ink dots for eyes and a tiny ink smile; a small paper CRANE perched
on his head (NU's `hair` slot, so it bobs); a red paper sash knotted at the waist with its tail flying; a red ink seal
stamped on his chest; folded triangle mitts and feet; and a folded paper fan (red and white pleats) in his front hand
(the `mic` slot). He is white so the game can tint him for his three FOLDS (CRANE / FROG / BLADE - fighterKami.js).

Every part is a 64x64 layer facing right, feet on row 58, shaded with nu_draw.shade5. draw_parts() returns
{name: RGBA array}.
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import blank, shade5, put, limb, hx, ORDER, RIG, composite   # noqa: F401

VARIANT = 'default'
PAPER = (0xffffff, 0xf8f6f0, 0xece8dc, 0xc4bcaa, 0x3a3430)
RED = (0xff9a8a, 0xf0503c, 0xc82a1e, 0x8a1410, 0x2a0806)
INK = 0x1a1418

VARIANTS = {
    'default': {},
    'newsprint': {'PAPER': (0xf4f0e0, 0xe6e0cc, 0xd4ccb4, 0xa49c84, 0x2a2620), 'RED': (0x8a8a8a, 0x5a5a5a, 0x3a3a3a, 0x1e1e1e, 0x080808)},
    'gold': {'PAPER': (0xfff8d0, 0xfce8a0, 0xf0cc60, 0xc09430, 0x3a2808), 'RED': (0xff8ac8, 0xe04a9a, 0xb02870, 0x6a1040, 0x200414)},
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

def crease(a, p0, p1, c):
    """A fold line across a part (only where the part is)."""
    (x0, y0), (x1, y1) = p0, p1; n = max(abs(x1 - x0), abs(y1 - y0), 1)
    put(a, [(int(round(x0 + (x1 - x0) * i / n)), int(round(y0 + (y1 - y0) * i / n))) for i in range(n + 1)], c)

def folded(pts, pal, creases=()):
    """A flat paper polygon, shaded, with fold lines."""
    im = blank(); d = ImageDraw.Draw(im); d.polygon(pts, fill=hx(pal[2])); a = shade5(im, pal)
    for p0, p1 in creases: crease(a, p0, p1, pal[3])
    return a

def draw_parts():
    """KAMI, part by part (see the top of the file)."""
    PA, RD = R('PAPER'), R('RED')
    P = {}
    # ---------------- legs: folded strips with a crease down each, triangle feet
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 54)), ('f', (37, 40), (40, 48), (40, 54))):
        P[side + 'thigh'] = folded([(hip[0] - 3, hip[1] - 1), (hip[0] + 3, hip[1] - 1), (knee[0] + 2, knee[1] + 1), (knee[0] - 2, knee[1] + 1)], PA, [((hip[0], hip[1]), (knee[0], knee[1]))])
        P[side + 'shin'] = folded([(knee[0] - 2, knee[1] - 1), (knee[0] + 2, knee[1] - 1), (ank[0] + 2, ank[1]), (ank[0] - 2, ank[1])], PA, [((knee[0] + 1, knee[1]), (ank[0] + 1, ank[1] - 1))])
        x0 = ank[0] - 3
        P[side + 'shoe'] = folded([(x0, 53), (x0 + 5, 53), (x0 + 10, 58), (x0, 58)], PA, [((x0 + 2, 54), (x0 + 6, 58))])
    # ---------------- back arm: a folded tube and a triangle mitt
    P['bupper'] = folded([(25, 23), (29, 23), (27, 32), (23, 31)], PA, [((27, 24), (25, 31))])
    a = folded([(23, 30), (27, 31), (28, 36), (24, 36)], PA)
    over(a, folded([(23, 35), (29, 35), (26, 41)], PA))
    P['bfore'] = a
    # ---------------- torso: a folded body (a centre crease, two diagonal folds), the red seal, the sash and its tail
    a = folded([(29, 21), (37, 21), (40, 25), (38, 33), (39, 41), (27, 41), (28, 33), (26, 25)], PA, [((33, 21), (33, 41)), ((26, 25), (33, 31)), ((40, 25), (33, 31))])
    put(a, [(x, y) for x in range(34, 37) for y in range(26, 29)], RD[2]); put(a, [(35, 26), (35, 27), (34, 27), (36, 27)], PA[1])   # the red seal
    sash = folded([(26, 35), (40, 35), (40, 39), (26, 39)], RD)
    over(sash, folded([(27, 36), (22, 37), (16, 41), (18, 42), (23, 39), (27, 38)], RD))                 # the knot's tail, flying back
    put(sash, [(x, 37) for x in range(27, 40)], RD[1])
    over(a, sash)
    P['torso'] = a
    # ---------------- head: a folded diamond, two ink eyes, a tiny smile
    a = folded([(35, 7), (41, 13), (39, 19), (33, 21), (30, 15), (31, 10)], PA, [((35, 7), (33, 21)), ((31, 10), (41, 13))])
    put(a, [(36, 13), (37, 13), (36, 14), (37, 14)], INK); put(a, [(39, 13), (39, 14)], INK)                # the ink eyes
    put(a, [(36, 13)], 0xffffff)
    put(a, [(37, 17), (38, 17), (39, 16)], INK)                                                              # a tiny smile
    put(a, [(35, 16)], 0xffb0a0)
    P['head'] = a
    # ---------------- hair = the paper CRANE perched on his head: body, raised wings, a long neck and tail
    cr = folded([(31, 7), (36, 4), (41, 6), (36, 9)], PA, [((31, 7), (41, 6))])                             # body
    over(cr, folded([(35, 5), (28, 0), (30, 4), (34, 7)], PA, [((29, 1), (34, 6))]))                        # one wing, swept up and back
    over(cr, folded([(40, 6), (44, 2), (45, 3), (41, 7)], PA))                                               # the neck forward...
    over(cr, folded([(44, 1), (48, 2), (45, 4)], RD))                                                        # ...a red beak
    over(cr, folded([(32, 7), (24, 5), (25, 7), (31, 8)], PA))                                               # the tail, straight back
    setp(cr, [(44, 3)], INK)
    P['hair'] = cr
    # ---------------- front arm: a folded tube, a mitt; the paper fan (mic slot) - red and white pleats
    P['fupper'] = folded([(37, 23), (41, 24), (44, 31), (40, 32)], PA, [((39, 24), (42, 31))])
    P['ffore'] = folded([(40, 30), (44, 31), (46, 27), (43, 26)], PA)
    fan = blank(); df = ImageDraw.Draw(fan)
    import math
    for k in range(7):                                                                                       # seven pleats fanning up and forward from the hand
        a0 = math.radians(-55 + k * 16); a1 = math.radians(-55 + (k + 1) * 16); r = 11
        df.polygon([(44, 26), (44 + r * math.cos(a0), 26 + r * math.sin(a0)), (44 + r * math.cos(a1), 26 + r * math.sin(a1))], fill=hx(RD[2] if k % 2 else PA[2]))
    fa = np.array(fan)
    ring = np.zeros((64, 64, 4), np.uint8)
    for y in range(64):
        for x in range(64):
            if fa[y, x, 3] and any(not (0 <= y + dy < 64 and 0 <= x + dx < 64) or not fa[y + dy, x + dx, 3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): ring[y, x] = hx(RD[4])
    over(fa, ring)
    for k in range(8):
        a0 = math.radians(-55 + k * 16)
        for r in range(3, 10): setp(fa, [(int(round(44 + r * math.cos(a0))), int(round(26 + r * math.sin(a0))))], RD[3] if r < 9 else RD[4])   # the ribs
    P['mic'] = fa
    a = folded([(42, 24), (47, 25), (45, 29), (42, 28)], PA); P['ffist'] = a
    P['can'] = np.zeros((64, 64, 4), np.uint8)
    return P

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (60, 70, 110, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((512, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'kami_preview.png')
