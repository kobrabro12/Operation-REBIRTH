"""VITRAIL - THE ROSE OF SEVEN HOURS. The great stained-glass window of the Sky Sanctum's chapel, broken by the falling
star on the night of the Starfall and reborn as a person - in the shape of the monks who sat under it for four hundred
years. His drawing, part by part on NU's joints (nu_draw RIG; his own ORDER - see below), animated by trio_moves.py with
the puppet rig.

An original design:
- a deep hood round a smooth white glass mask, no features but one glowing crack down it where the star went through;
- behind his head the ROSE itself as a halo: a great round window of lead and four panes - the four elements its
  glazier set in it: FIRE (top left), ICE (top right), STORM (bottom right) and THE DARK between the stars (bottom
  left) - with a gilt rim and gilt knots (the `hair` slot, drawn BEHIND everything: his own ORDER);
- a long hooded robe with gilt trim down the front and a leaded-glass STOLE hanging from his shoulders, small panes in
  the four colours; a gilt sash;
- his legs are the robe's split front panels over dark boots with gilt toes;
- wide sleeves with gilt cuffs, white-gloved hands (nothing in them: the game draws the four element shards that orbit
  him and the attacks themselves).

Every part is a 64x64 layer facing right, feet on row 58, shaded with nu_draw.shade5 (5-tone ramps: highlight, light,
base, shadow, outline). draw_parts() returns {name: RGBA array}.
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import blank, shade5, limb, hx, ORDER as NU_ORDER, RIG   # noqa: F401  (RIG: the rig uses it)

VARIANT = 'default'
# his own draw order: the halo (`hair`) behind everything
ORDER = ['hair'] + [n for n in NU_ORDER if n != 'hair']

# the four elements (the game's colours: fighterVitrail.js / vitrail.js)
EL = {'F': 0xff6a2a, 'I': 0x7ae8ff, 'L': 0xffe04a, 'V': 0xa04aff}
# each look: the robe (5 tones), the trim, the mask (5 tones), the crack's glow, the boots, the element colours
LOOKS = {
    # deep indigo robe, gilt trim, white glass mask, the star's violet in the crack
    'default': {'robe': (0x6a6aa8, 0x4a4a86, 0x2e2e62, 0x1e1e44, 0x0c0c1e), 'trim': (0xfff0b0, 0xf2c84a, 0xb88a24),
                'mask': (0xffffff, 0xf2f0f8, 0xd8d4e8, 0xa8a2c0, 0x3a3650), 'crack': 0xb87aff, 'boot': (0x4a4560, 0x2c2838, 0x1a1724, 0x101016, 0x08080c), 'el': EL},
    # THE NIGHT WINDOW: a white robe with silver trim under moonlight, a blue crack, the panes cooled to night colours
    'nocturne': {'robe': (0xffffff, 0xe0e6f4, 0xb8c2dc, 0x7a86a8, 0x22283a), 'trim': (0xffffff, 0xc8d8f0, 0x7a8aa8),
                 'mask': (0xffffff, 0xeef4ff, 0xc8d8f0, 0x8a9ac0, 0x22283a), 'crack': 0x9ac8ff, 'boot': (0x6a7088, 0x3a4058, 0x22263a, 0x14162a, 0x080a14),
                 'el': {'F': 0xff8a9a, 'I': 0x9ae8ff, 'L': 0xe8f0ff, 'V': 0x6a7aff}},
    # THE BURNING ROSE: a black robe with ember trim, the mask scorched, the crack glowing like a coal
    'ember': {'robe': (0x5a3a30, 0x3a2620, 0x241612, 0x160c0a, 0x080404), 'trim': (0xffd08a, 0xff8a2a, 0xa83a1a),
              'mask': (0xfff0d8, 0xd8c0a8, 0xa88a70, 0x6a4a3a, 0x241410), 'crack': 0xff6a1a, 'boot': (0x3a2620, 0x241612, 0x160c0a, 0x0c0606, 0x040202),
              'el': {'F': 0xff5a1a, 'I': 0xffd08a, 'L': 0xffb02a, 'V': 0x8a1a2a}},
}
VARIANTS = {k: {} for k in LOOKS}

def L():
    """The current look."""
    return LOOKS.get(VARIANT, LOOKS['default'])

def tone(c, k):
    """Colour c lightened (k > 0, toward white) or darkened (k < 0, toward black)."""
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    if k >= 0: r, g, b = r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k
    else: r, g, b = r * (1 + k), g * (1 + k), b * (1 + k)
    return (int(r) << 16) | (int(g) << 8) | int(b)

def blank_arr(): return np.zeros((64, 64, 4), np.uint8)

def setp(a, pts, c):
    """Sets pixels whether or not the layer has anything there."""
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64: a[y, x] = hx(c)

def over(a, b):
    """Lays layer b's pixels onto a."""
    m = b[..., 3] > 0; a[m] = b[m]; return a

def shape(fn, ramp):
    """A part drawn with PIL (fn(d) fills in ramp[2]) and shaded with shade5."""
    im = blank(); fn(ImageDraw.Draw(im)); return shade5(im, ramp)

def composite(P, hide=('can',)):
    """All his parts layered in ORDER (for previews and the rig's base picture)."""
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide or n not in P: continue
        a = P[n]; m = a[..., 3] > 0
        out[m] = a[m]
    return out

def draw_parts():
    """VITRAIL, part by part (see the top of the file)."""
    lk = L(); RB = lk['robe']; TR = lk['trim']; MK = lk['mask']; BT = lk['boot']; E = lk['el']
    P = {}
    # ---------------- legs: the robe's split front panels (gilt hem), dark boots with gilt toes
    for side, hip, knee, ank in (('b', (29, 42), (27, 49), (26, 54)), ('f', (36, 42), (38, 49), (38, 54))):
        R = RB if side == 'f' else tuple(tone(c, -0.25) for c in RB)
        a = shape(lambda d: d.polygon([(hip[0] - 3, hip[1] - 2), (hip[0] + 3, hip[1] - 2), (knee[0] + 3, knee[1] + 1), (knee[0] - 3, knee[1] + 1)], fill=hx(R[2])), R)
        setp(a, [(x, knee[1] + 1) for x in range(knee[0] - 3, knee[0] + 4)], TR[1]); P[side + 'thigh'] = a     # the hem
        a = shape(lambda d: limb(d, knee, ank, 3, hx(BT[2])), BT); P[side + 'shin'] = a
        x0 = ank[0] - 3
        a = shape(lambda d: d.polygon([(x0, 52), (x0 + 5, 52), (x0 + 6, 55), (x0 + 8, 56), (x0 + 8, 58), (x0 + 1, 58)], fill=hx(BT[2])), BT)
        setp(a, [(x0 + 8, 57), (x0 + 9, 57), (x0 + 9, 56)], TR[1]); P[side + 'shoe'] = a
    # ---------------- back arm: a wide sleeve, a gilt cuff, a white glove
    a = shape(lambda d: limb(d, (27, 24), (25, 31), 6, hx(tone(RB[2], -0.2))), tuple(tone(c, -0.2) for c in RB)); P['bupper'] = a
    a = shape(lambda d: d.polygon([(23, 30), (28, 30), (29, 36), (22, 36)], fill=hx(tone(RB[2], -0.2))), tuple(tone(c, -0.2) for c in RB))
    setp(a, [(x, 36) for x in range(22, 30)], TR[2])
    over(a, shape(lambda d: d.ellipse([24, 36, 28, 40], fill=hx(MK[2])), MK)); P['bfore'] = a
    P['can'] = blank_arr()
    # ---------------- torso: the long hooded robe, gilt trim, the leaded-glass stole, the sash
    a = shape(lambda d: d.polygon([(28, 16), (39, 16), (40, 24), (41, 34), (43, 46), (44, 50), (22, 50), (24, 44), (26, 34), (27, 24)], fill=hx(RB[2])), RB)
    setp(a, [(33, y) for y in range(18, 50)], TR[1]); setp(a, [(34, y) for y in range(18, 50, 4)], TR[0])          # the trim
    setp(a, [(x, 49) for x in range(23, 44)], TR[2])
    order = 'FILV'
    for sx in (30, 36):                                                                     # the stole: a lead strip of small panes
        setp(a, [(x, y) for x in range(sx - 1, sx + 3) for y in range(18, 45)], 0x0c0a12)
        for i, y in enumerate(range(19, 43, 3)):
            c = E[order[(i + (sx == 36) * 2) % 4]]
            setp(a, [(sx, y), (sx + 1, y), (sx, y + 1), (sx + 1, y + 1)], c); setp(a, [(sx, y)], tone(c, 0.5)); setp(a, [(sx + 1, y + 1)], tone(c, -0.3))
        setp(a, [(sx, 45), (sx + 1, 45), (sx, 46), (sx + 1, 47)], TR[1])                    # the stole's gilt fringe
    setp(a, [(x, 34) for x in range(27, 41)], TR[2]); setp(a, [(x, 33) for x in range(27, 41)], TR[1])        # the sash
    P['torso'] = a
    # ---------------- head: the hood round a white glass mask with one glowing crack
    a = shape(lambda d: d.polygon([(28, 6), (33, 4), (39, 5), (42, 9), (42, 16), (40, 21), (31, 21), (28, 16), (26, 10)], fill=hx(RB[2])), RB)
    over(a, shape(lambda d: d.ellipse([33, 8, 41, 19], fill=hx(MK[2])), MK))
    for (x, y) in [(38, 9), (37, 10), (37, 11), (38, 12), (37, 13), (37, 14), (38, 15), (38, 16), (37, 17)]: setp(a, [(x, y)], lk['crack'])
    setp(a, [(37, 12), (38, 13)], 0xffffff)
    setp(a, [(29, 6), (27, 8)], tone(RB[0], 0.2)); setp(a, [(x, 20) for x in range(31, 41)], TR[2])                 # hood shine, gilt edge
    P['head'] = a
    # ---------------- hair: the ROSE as a halo behind his head - lead, four element panes, a gilt rim and knots
    a = blank_arr(); cx, cy, R0 = 33.0, 12.0, 12.0
    quad = {(0, 0): 'F', (1, 0): 'I', (1, 1): 'L', (0, 1): 'V'}                             # (right?, below?) -> element
    for y in range(64):
        for x in range(64):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy; d = math.hypot(dx, dy)
            if d > R0: continue
            if d > R0 - 1.1: a[y, x] = hx(TR[2] if dy > 0 else TR[1]); continue              # the gilt rim
            if d > R0 - 2: a[y, x] = hx(0x0c0a12); continue                                  # lead inside it
            if abs(dx) < 0.9 or abs(dy) < 0.9 or abs(d - 5.2) < 0.6 or d < 2.2: a[y, x] = hx(0x0c0a12); continue   # the cross and the inner ring
            c = E[quad[(int(dx > 0), int(dy > 0))]]
            a[y, x] = hx(tone(c, 0.35) if (dx + dy) < -6 else tone(c, -0.3) if d > R0 - 3 else c)
    for i in range(8):
        t = i * math.pi / 4 + math.pi / 8
        setp(a, [(int(round(cx - 0.5 + math.cos(t) * (R0 - 1.5))), int(round(cy - 0.5 + math.sin(t) * (R0 - 1.5))))], TR[0])
    P['hair'] = a
    # ---------------- front arm: a wide sleeve, a gilt cuff, a white glove (empty-handed: the game draws his elements)
    a = shape(lambda d: limb(d, (38, 24), (42, 31), 6, hx(RB[2])), RB); P['fupper'] = a
    a = shape(lambda d: d.polygon([(40, 33), (44, 27), (47, 29), (44, 34)], fill=hx(RB[2])), RB)
    setp(a, [(43, 27), (44, 28), (45, 29), (46, 30)], TR[1]); P['ffore'] = a
    P['mic'] = blank_arr()
    P['ffist'] = shape(lambda d: d.ellipse([42, 23, 46, 28], fill=hx(MK[2])), MK)
    return P

if __name__ == '__main__':
    import sys
    for v in LOOKS:
        VARIANT = v
        c = composite(draw_parts())
        bg = Image.new('RGBA', (64, 64), (24, 20, 40, 255)); bg.alpha_composite(Image.fromarray(c))
        bg.resize((512, 512), Image.NEAREST).save((sys.argv[1] if len(sys.argv) > 1 else 'vitrail_preview') + '_' + v + '.png')
