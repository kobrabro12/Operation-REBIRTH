"""GNASH - a street punk kid swinging a giant neon axe (Mason's design: a punk kid, a mask with neon X eyes, neon
horns, the giant axe; from his notebook sketch: the zig-zag grin, "heavy, very hard hitting").
His drawing, part by part, on NU's rig and joints (tools/sprites/nu_draw.py) so nu_moves.py's poses fit him; his own
idle, specials, Limit and taunt are in gnash_moves.py.

A kid in a beat-up black leather jacket - silver studs on the shoulders, the collar up, a neon patch on the chest -
over a white tee, ripped jeans with his knees showing through and chunky high-tops with glowing laces. His face is
hidden behind a round black mask: two neon X's for eyes and a neon zig-zag grin stitched across it; a mess of dark
spiky hair sticks out the back and two NEON HORNS - glowing tubes - curve up off his head. THE AXE is nearly as big as
he is: a black haft wrapped in neon tape and a crescent blade of dark glass with a row of jagged spikes, its whole edge
a lit neon tube.

Costumes (VARIANTS): BLOOD MOON (`bloodmoon`: red neon, a crimson jacket) and TOXIC (`gravestone` - the folder keeps
its first name: acid-green neon, a grey hoodie-jacket).

Every part is a 64x64 layer, facing right, feet on row 58, shaded like NU (`shade5`).
"""
import math
import numpy as np
import legs_kit as LK
from PIL import Image, ImageDraw
from nu_draw import hx, shade5, put, limb, blank

BASE = {
    'skin': (0xffe8d8, 0xf4c8ae, 0xdca488, 0xa86e58, 0x40221c),
    'jacket': (0x5a5a6e, 0x3a3a4a, 0x26262f, 0x17171e, 0x07070a),
    'stud': (0xffffff, 0xd8dce8, 0xa0a8b8, 0x5a6070, 0x1a1c24),
    'tee': (0xffffff, 0xf0f0f4, 0xd0d0dc, 0x9a9aaa, 0x2a2a34),
    'jeans': (0x8aa0c8, 0x6a80ac, 0x4e6290, 0x34446a, 0x10162a),
    'shoe': (0xffffff, 0xe8e8ee, 0xc8c8d4, 0x8a8a9a, 0x1a1a24),
    'hair': (0x5a4a6a, 0x3a2e48, 0x261e30, 0x16101e, 0x06040a),
    'mask': (0x4a4a5a, 0x2e2e3a, 0x1a1a24, 0x101016, 0x040406),
    'haft': (0x4a4a56, 0x32323c, 0x22222a, 0x16161c, 0x060608),
    'glass': (0x4a3a6a, 0x34284e, 0x241c38, 0x161024, 0x06040c),
    'neon': (0xffffff, 0xffb8f0, 0xff3ad0, 0xb01090, 0x3a0430),        # hot pink tubes: the horns, the axe's edge, the grin
    'neon2': (0xffffff, 0xb8ffff, 0x3af0ff, 0x10a0c8, 0x04304a),       # electric cyan: the X eyes, the laces, the tape
}
VARIANTS = {
    'default': {},
    'bloodmoon': {'pal': {
        'jacket': (0xff6a6a, 0xc02a34, 0x8a1422, 0x5a0a14, 0x200408),
        'neon': (0xffffff, 0xffc0a0, 0xff4a2a, 0xb01a0a, 0x3a0604), 'neon2': (0xffffff, 0xffe0a0, 0xffb02a, 0xb0600a, 0x3a1a04),
        'hair': (0x2a2a2a, 0x1a1a1a, 0x101010, 0x080808, 0x020202), 'glass': (0x5a2020, 0x3e1414, 0x2a0c0c, 0x180606, 0x080202),
    }},
    'gravestone': {'pal': {
        'jacket': (0xb8bec8, 0x8e96a2, 0x6a7280, 0x464c5a, 0x1a1c24), 'jeans': (0x5a5a62, 0x46464e, 0x34343a, 0x222228, 0x0c0c10),
        'neon': (0xffffff, 0xd8ffb0, 0x8aff2a, 0x3aa80a, 0x103a04), 'neon2': (0xffffff, 0xf0ffb0, 0xd8ff3a, 0x8aa80a, 0x2a3a04),
        'hair': (0x9aff6a, 0x6ad83a, 0x4aa82a, 0x2a6a1a, 0x0a2a06), 'glass': (0x2a3a2a, 0x1e2a1e, 0x141e14, 0x0c140c, 0x040804),
    }},
}
VARIANT = 'default'

def pal():
    """The materials for the costume being drawn."""
    return {**BASE, **VARIANTS[VARIANT].get('pal', {})}

def layer(fn, mat):
    """A part: draw flat in the material's mid tone with fn(d, col), then shade it."""
    P = pal(); im = blank(); d = ImageDraw.Draw(im); fn(d, hx(P[mat][2])); return shade5(im, P[mat])

def over(a, b):
    """b laid over a."""
    m = b[..., 3] > 0; a[m] = b[m]; return a

def paint(a, pts, col):
    """Pixels set to col whether or not anything's there (put() only paints over what's drawn)."""
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64: a[y, x] = hx(col)

def tube(pts, mat, width=2):
    """A lit neon tube along the points: the colour's glow round a white-hot core."""
    P = pal(); im = blank(); d = ImageDraw.Draw(im)
    d.line(pts, fill=hx(P[mat][3]), width=width + 2, joint='curve'); d.line(pts, fill=hx(P[mat][2]), width=width, joint='curve')
    a = np.array(im); im2 = blank(); ImageDraw.Draw(im2).line(pts, fill=hx(P[mat][0]), width=1)
    return over(a, np.array(im2))

def horn(line, mat, w0=4.0):
    """A horn of solid neon along the centre line: thick at the base, tapering to a point, a white-hot core."""
    P = pal(); n = len(line); left, right = [], []
    for i, (x, y) in enumerate(line):
        px, py = line[max(0, i - 1)]; qx, qy = line[min(n - 1, i + 1)]; dx, dy = qx - px, qy - py; L = math.hypot(dx, dy) or 1
        w = w0 * (1 - i / (n - 1)) / 2 + 0.3; left.append((x - dy / L * w, y + dx / L * w)); right.append((x + dy / L * w, y - dx / L * w))
    im = blank(); d = ImageDraw.Draw(im); d.polygon(left + right[::-1], fill=hx(P[mat][2]))
    a = shade5(im, P[mat]); core = blank(); ImageDraw.Draw(core).line(line[:-1], fill=hx(P[mat][0]), width=1)
    m = np.array(core)[..., 3] > 0; a[m & (a[..., 3] > 0)] = hx(P[mat][0]); return a

def draw_parts():
    """GNASH (or the costume in VARIANT): every part as a 64x64 RGBA array."""
    P = pal(); parts = {}
    # ---------------- legs: ripped jeans (knees through the rips), chunky high-tops with glowing laces
    for side, hip, knee, ank in (('b', (28, 40), (26, 48), (24, 55)), ('f', (36, 40), (39, 48), (40, 55))):
        a = layer(lambda d, c: LK.seg(d, hip, knee, 7, 6, c, bulge=0.6, at=0.5), 'jeans')
        put(a, [(knee[0] - 1, knee[1] - 2), (knee[0], knee[1] - 2), (knee[0] + 1, knee[1] - 1), (knee[0], knee[1] - 1)], P['skin'][2])   # the rip over the knee
        put(a, [(knee[0] - 2, knee[1] - 3), (knee[0] + 1, knee[1] - 3)], P['tee'][1])                                                     # loose threads
        parts[side + 'thigh'] = a
        a = layer(lambda d, c: LK.seg(d, knee, (ank[0], ank[1] - 2), 6, 7, c, bulge=0.2, at=0.3), 'jeans')
        put(a, LK.along(knee, ank, 1, 0.3, 0.8, 3), P['jeans'][1])
        parts[side + 'shin'] = a
        a = layer(lambda d, c: LK.shoe(d, ank, c, 'boot', length=9, top=ank[1] - 4), 'shoe')
        put(a, [(x, 58) for x in range(ank[0] - 4, ank[0] + 10)], P['neon2'][2]); put(a, [(x, 57) for x in range(ank[0] - 4, ank[0] + 10)], P['shoe'][3])   # a glowing sole
        put(a, [(ank[0] + 1, ank[1] - 3), (ank[0] + 2, ank[1] - 2), (ank[0] + 1, ank[1] - 1), (ank[0] + 2, ank[1])], P['neon2'][1])                    # neon laces
        put(a, [(ank[0] - 3, ank[1] - 1), (ank[0] - 3, ank[1])], P['jacket'][2])
        parts[side + 'shoe'] = a
    # ---------------- the back arm: a leather sleeve, a fist in a fingerless glove
    parts['bupper'] = layer(lambda d, c: limb(d, (27, 24), (24, 31), 6, c), 'jacket')
    a = layer(lambda d, c: limb(d, (24, 31), (24, 36), 5, c), 'jacket')
    a = over(a, layer(lambda d, c: d.ellipse([21, 35, 27, 40], fill=c), 'skin')); put(a, [(21, 36), (22, 36), (23, 36), (24, 36), (25, 36)], P['jacket'][3])
    parts['bfore'] = a
    # ---------------- the torso: an open leather jacket, studs on the shoulders, a white tee, a neon patch
    a = layer(lambda d, c: d.polygon([(26, 21), (40, 21), (42, 24), (42, 33), (41, 41), (27, 41), (25, 37), (25, 27)], fill=c), 'jacket')
    a = over(a, layer(lambda d, c: d.polygon([(31, 21), (37, 21), (37, 41), (31, 41)], fill=c), 'tee'))                      # the tee showing down the front
    put(a, [(31, y) for y in range(22, 41)] + [(37, y) for y in range(22, 41)], P['jacket'][4])                                 # the jacket's open edges
    for y in range(28, 34): put(a, [(33, y), (34, y), (35, y)], P['neon'][2] if (y % 3) else P['neon'][1])                   # a neon print on the tee
    put(a, [(32, 28), (36, 28), (32, 33), (36, 33)], P['neon'][3])
    put(a, [(27, 22), (29, 22), (39, 22), (41, 23), (26, 24), (28, 24)], P['stud'][1])                                          # silver studs on the shoulders
    put(a, [(39, 30), (40, 30), (39, 31), (40, 31)], P['neon2'][2])                                                              # a little neon pin
    put(a, [(x, 40) for x in range(27, 41)], P['jacket'][4]); put(a, [(30, 39), (38, 39)], P['stud'][1])                        # the belt
    put(a, [(28, 21), (29, 20), (38, 20), (39, 21)], P['jacket'][1])                                                            # the collar up
    parts['torso'] = a
    # ---------------- the head: a round black mask, neon X eyes, the neon zig-zag grin stitched across it
    a = layer(lambda d, c: d.ellipse([27, 6, 42, 22], fill=c), 'mask')
    put(a, [(29, 9), (30, 8), (31, 8)], P['mask'][0])                                                                       # a shine
    for cx in (33, 39):                                                                                                     # the X eyes: big, glowing
        put(a, [(cx - 2, 8), (cx + 2, 8), (cx - 1, 9), (cx + 1, 9), (cx - 1, 11), (cx + 1, 11), (cx - 2, 12), (cx + 2, 12)], P['neon2'][2])
        put(a, [(cx, 10)], P['neon2'][0])
    zig = [(29, 16), (31, 14), (33, 17), (35, 14), (37, 17), (39, 14), (41, 16)]                                            # the grin
    im = blank(); ImageDraw.Draw(im).line(zig, fill=(255, 255, 255, 255), width=1)
    m = np.array(im)[..., 3] > 0; a[m & (a[..., 3] > 0)] = hx(P['neon'][1])
    put(a, [(31, 14), (35, 14), (39, 14)], P['neon'][0])
    put(a, [(x, 18) for x in range(30, 41, 2)], P['mask'][1])                                                               # the stitching under it
    parts['head'] = a
    # ---------------- the 'hair' slot: a mess of dark spikes out the back, and the two NEON HORNS
    h = layer(lambda d, c: (d.polygon([(28, 9), (24, 7), (27, 10), (23, 12), (27, 13), (24, 16), (28, 16), (29, 12)], fill=c),
                            d.polygon([(30, 7), (29, 3), (32, 6), (33, 4), (34, 7)], fill=c)), 'hair')
    for line in ([(30, 9), (27, 7), (25, 4), (25, 1), (26, 0)], [(38, 8), (41, 6), (43, 3), (43, 1), (42, 0)]):         # the horns: tapered neon, curling up and in
        h = over(h, horn(line, 'neon'))
    parts['hair'] = h
    # ---------------- the front arm and THE AXE (in the 'mic' slot): a black haft in neon tape, a giant dark-glass blade edged in neon
    parts['fupper'] = layer(lambda d, c: limb(d, (38, 24), (42, 31), 6, c), 'jacket')
    parts['ffore'] = layer(lambda d, c: limb(d, (42, 31), (44, 27), 5, c), 'jacket')
    hf = layer(lambda d, c: d.line([(44, 36), (47, 3)], fill=c, width=3), 'haft')
    for y in (8, 20, 25, 30): put(hf, [(44, y), (45, y), (46, y), (47, y)], P['neon2'][2])                               # neon tape bands
    put(hf, [(44, 36), (45, 36), (44, 37)], P['stud'][2])
    cx, cy = 47, 13
    spikes = []
    for i in range(15):
        q = -1.45 + i * (2.9 / 14); r = 16.5 if i % 2 else 11.5
        spikes.append((cx + math.cos(q) * r, cy + math.sin(q) * r * 0.95))
    inner = [(cx + 1 + math.cos(q) * 4, cy + math.sin(q) * 7) for q in (1.2, 0.4, -0.4, -1.2)]
    b = layer(lambda d, c: d.polygon(spikes + inner, fill=c), 'glass')
    b = over(b, tube(spikes, 'neon', 1))                                                                                     # the edge: one lit tube along every spike
    put(b, [(51, 9), (52, 10), (51, 11), (53, 14), (52, 15)], P['glass'][0])                                                # a glint in the glass
    for i in range(0, 15, 2):
        q = -1.45 + i * (2.9 / 14); paint(b, [(round(cx + math.cos(q) * 11.5), round(cy + math.sin(q) * 11.5 * 0.95))], P['neon2'][1])
    parts['mic'] = over(hf, b)
    a = layer(lambda d, c: d.ellipse([41, 24, 48, 30], fill=c), 'skin'); put(a, [(41, 26), (42, 26), (43, 26), (44, 26), (45, 26), (46, 26), (47, 26)], P['jacket'][3])   # a fingerless glove
    put(a, [(42, 28), (43, 28), (44, 28), (45, 28)], P['skin'][3])
    parts['ffist'] = a
    return parts

ORDER = ['bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'hair', 'fupper', 'ffore', 'mic', 'ffist']
RIG = {
    'torso': ((32, 39), None),
    'head': ((33, 21), 'torso'), 'hair': ((33, 21), 'head'),
    'bupper': ((27, 24), 'torso'), 'bfore': ((24, 31), 'bupper'),
    'fupper': ((38, 24), 'torso'), 'ffore': ((42, 31), 'fupper'), 'mic': ((44, 27), 'ffore'), 'ffist': ((44, 27), 'ffore'),
    'bthigh': ((28, 40), None), 'bshin': ((26, 48), 'bthigh'), 'bshoe': ((24, 55), 'bshin'),
    'fthigh': ((36, 40), None), 'fshin': ((39, 48), 'fthigh'), 'fshoe': ((40, 55), 'fshin'),
}

def composite(P, hide=()):
    """All the parts stacked in ORDER (minus `hide`)."""
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide or n not in P: continue
        a = P[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    row = Image.new('RGBA', (64 * 3, 64), (120, 160, 220, 255))
    for i, v in enumerate(VARIANTS):
        VARIANT = v
        row.alpha_composite(Image.fromarray(composite(draw_parts())), (i * 64, 0))
    row.resize((64 * 3 * 8, 64 * 8), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'gnash_preview.png')
