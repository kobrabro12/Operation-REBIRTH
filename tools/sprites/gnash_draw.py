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

# every bit of his clothing is black, outlined in neon: shade5's outer ring is the material's last colour, so a
# black ramp ending in a neon colour draws the whole outfit as a neon-edged silhouette
PAD, SIZE = 40, 144         # his parts sit on a 144x144 canvas, 40 px in, so the giant axe has room: pivots are +PAD

def pad(a):
    """A 64x64 part moved onto the big canvas."""
    out = np.zeros((SIZE, SIZE, 4), np.uint8); out[PAD:PAD + 64, PAD:PAD + 64] = a; return out

def layerB(fn, mat):
    """layer() on the big canvas (the axe)."""
    P = pal(); im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)); fn(ImageDraw.Draw(im), hx(P[mat][2])); return shade5(im, P[mat])

def putB(a, pts, col):
    """put() on the big canvas: recolour drawn pixels only."""
    for (x, y) in pts:
        if 0 <= y < SIZE and 0 <= x < SIZE and a[y, x, 3]: a[y, x] = hx(col)

def outlined(neon, lift=0):
    """A black material whose outline glows `neon`."""
    return (0x4a4a5c + lift, 0x2e2e3c + lift, 0x1c1c26 + lift, 0x101016, neon)

NEONS = {   # each look's three neons: the outfit's outline, the eyes / laces / tape, the axe's diamond
    'default': (0xff3ad0, 0x3af0ff, 0x6aff3a),
    'bloodmoon': (0xff3a2a, 0xffb02a, 0xff3a2a),
    'gravestone': (0x8aff2a, 0xd8ff3a, 0x8aff2a),
}

def neon_ramp(c):
    """A neon tube's five tones from its colour: white-hot, light, the colour, deep, dark."""
    r, g, b = c >> 16 & 255, c >> 8 & 255, c & 255
    mix = lambda t, k: int(t + (255 - t) * k) if k > 0 else int(t * (1 + k))
    tone = lambda k: (mix(r, k) << 16) | (mix(g, k) << 8) | mix(b, k)
    return (0xffffff, tone(0.6), c, tone(-0.4), tone(-0.8))

BASE = {
    'skin': (0xffe8d8, 0xf4c8ae, 0xdca488, 0xa86e58, 0x40221c),
    'stud': (0xffffff, 0xd8dce8, 0xa0a8b8, 0x5a6070, 0x1a1c24),
    'hair': (0x5a4a6a, 0x3a2e48, 0x261e30, 0x16101e, 0x06040a),
    'mask': (0x4a4a5a, 0x2e2e3a, 0x1a1a24, 0x101016, 0x040406),
    'haft': (0x4a4a56, 0x32323c, 0x22222a, 0x16161c, 0x060608),
    'glass': (0x56566a, 0x34343f, 0x1c1c24, 0x101016, 0x040406),        # the axe head: black, a dull sheen on its edge
}
VARIANTS = {
    'default': {},
    'bloodmoon': {'pal': {'hair': (0x2a2a2a, 0x1a1a1a, 0x101010, 0x080808, 0x020202)}},
    'gravestone': {'pal': {'hair': (0x9aff6a, 0x6ad83a, 0x4aa82a, 0x2a6a1a, 0x0a2a06)}},
}
VARIANT = 'default'

def pal():
    """The materials for the costume being drawn: the base ones, the look's own, and its neons and black outfit."""
    n1, n2, n3 = NEONS[VARIANT]
    return {**BASE, 'neon': neon_ramp(n1), 'neon2': neon_ramp(n2), 'neon3': neon_ramp(n3),
            'jacket': outlined(n1, 0x060606), 'tee': outlined(n1), 'jeans': outlined(n1, 0x020204), 'shoe': outlined(n2, 0x0a0a0a),
            **VARIANTS[VARIANT].get('pal', {})}

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
        put(a, [(knee[0] - 2, knee[1] - 3), (knee[0] + 1, knee[1] - 3)], P['neon'][2])                                                    # neon threads round the rip
        parts[side + 'thigh'] = a
        a = layer(lambda d, c: LK.seg(d, knee, (ank[0], ank[1] - 2), 6, 7, c, bulge=0.2, at=0.3), 'jeans')
        put(a, LK.along(knee, ank, 1, 0.3, 0.8, 3), P['neon'][3])
        parts[side + 'shin'] = a
        a = layer(lambda d, c: LK.shoe(d, ank, c, 'boot', length=9, top=ank[1] - 4), 'shoe')
        put(a, [(x, 58) for x in range(ank[0] - 4, ank[0] + 10)], P['neon2'][2]); put(a, [(x, 57) for x in range(ank[0] - 4, ank[0] + 10)], P['shoe'][3])   # a glowing sole
        put(a, [(ank[0] + 1, ank[1] - 3), (ank[0] + 2, ank[1] - 2), (ank[0] + 1, ank[1] - 1), (ank[0] + 2, ank[1])], P['neon2'][1])                    # neon laces
        put(a, [(ank[0] - 3, ank[1] - 1), (ank[0] - 3, ank[1])], P['jacket'][2])
        parts[side + 'shoe'] = a
    # ---------------- the back arm: a leather sleeve, a fist in a fingerless glove
    # (its shoulder sits mid-chest, behind the torso, so it can reach across to the axe: the two-handed grip - gnash_moves.py's IK)
    parts['bupper'] = layer(lambda d, c: limb(d, (33, 24), (31, 32), 6, c), 'jacket')
    parts['bfore'] = layer(lambda d, c: limb(d, (31, 32), (32, 38), 5, c), 'jacket')
    a = layer(lambda d, c: d.ellipse([29, 36, 36, 42], fill=c), 'skin'); put(a, [(x, 37) for x in range(29, 37)], P['mask'][2])   # a fingerless glove
    put(a, [(31, 40), (32, 40), (33, 40), (34, 40)], P['skin'][3])
    parts['bfist'] = a                                                       # (drawn over the haft: his back hand wraps round it)
    # ---------------- the torso: an open leather jacket, studs on the shoulders, a white tee, a neon patch
    a = layer(lambda d, c: d.polygon([(26, 21), (40, 21), (42, 24), (42, 33), (41, 41), (27, 41), (25, 37), (25, 27)], fill=c), 'jacket')
    a = over(a, layer(lambda d, c: d.polygon([(31, 21), (37, 21), (37, 41), (31, 41)], fill=c), 'tee'))                      # the tee showing down the front
    put(a, [(31, y) for y in range(22, 41)] + [(37, y) for y in range(22, 41)], P['neon'][3])                                   # the jacket's open edges, lit
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
    # THE AXE (drawn on the big canvas - it doesn't fit in 64): taller than he is and held in both hands at the
    # bottom of a long black haft (his back hand under the front fist, at GRIP), a huge black crescent blade way up top
    # with a glowing neon diamond outlined in the middle of it
    O = PAD
    hf = layerB(lambda d, c: d.line([(44 + O, 41 + O), (48 + O, -33 + O)], fill=c, width=3), 'haft')
    for y in (-26, -4, 12, 31): putB(hf, [(x + O, y + O) for x in range(43, 50)], P['neon2'][2])                              # neon tape bands
    putB(hf, [(43 + O, 40 + O), (44 + O, 40 + O), (45 + O, 40 + O), (44 + O, 41 + O)], P['stud'][2])                 # the pommel
    cx, cy = 49 + O, -14 + O
    spikes = []
    for i in range(17):
        q = -1.5 + i * (3.0 / 16); r = 22 if i % 2 else 16
        spikes.append((cx + math.cos(q) * r, cy + math.sin(q) * r * 0.98))
    inner = [(cx + 1 + math.cos(q) * 5, cy + math.sin(q) * 10) for q in (1.2, 0.4, -0.4, -1.2)]
    b = layerB(lambda d, c: d.polygon(spikes + inner, fill=c), 'glass')
    b = over(b, layerB(lambda d, c: d.polygon([(49 + O, -21 + O), (40 + O, -30 + O), (39 + O, -23 + O)], fill=c), 'glass'))   # a hooked spike off the back
    for i in range(1, 17, 2):                                                                                               # a dull sheen along the edge
        q = -1.5 + i * (3.0 / 16); putB(b, [(round(cx + math.cos(q) * 19.5), round(cy + math.sin(q) * 19.5 * 0.98))], P['glass'][0])
    dx0, dy0 = 61 + O, -14 + O                                                                                                # the diamond: a glowing neon outline
    ring = [(dx0, dy0 - 8), (dx0 + 5, dy0), (dx0, dy0 + 8), (dx0 - 5, dy0), (dx0, dy0 - 8)]
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)); dd = ImageDraw.Draw(im); dd.polygon(ring[:-1], fill=hx(P['neon3'][4]))
    dd.line(ring, fill=hx(P['neon3'][2]), width=2); dd.line(ring, fill=hx(P['neon3'][0]), width=1)
    dm = np.array(im); m = dm[..., 3] > 0; b[m] = dm[m]
    axe = over(hf, b)
    a = layer(lambda d, c: d.ellipse([41, 24, 48, 30], fill=c), 'skin'); put(a, [(41, 26), (42, 26), (43, 26), (44, 26), (45, 26), (46, 26), (47, 26)], P['jacket'][3])   # a fingerless glove
    put(a, [(42, 28), (43, 28), (44, 28), (45, 28)], P['skin'][3])
    parts['ffist'] = a
    parts = {n: pad(v) for n, v in parts.items()}                         # everything onto the big canvas ...
    parts['mic'] = axe                                                      # ... where the axe was drawn
    return parts

ORDER = ['bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'hair', 'fupper', 'ffore', 'mic', 'bfist', 'ffist']
# (the joints on the big canvas: the 64x64 drawing's + PAD)
RIG = {
    'torso': ((32 + PAD, 39 + PAD), None),
    'head': ((33 + PAD, 21 + PAD), 'torso'), 'hair': ((33 + PAD, 21 + PAD), 'head'),
    'bupper': ((33 + PAD, 24 + PAD), 'torso'), 'bfore': ((31 + PAD, 32 + PAD), 'bupper'), 'bfist': ((32 + PAD, 38 + PAD), 'bfore'),
    'fupper': ((38 + PAD, 24 + PAD), 'torso'), 'ffore': ((42 + PAD, 31 + PAD), 'fupper'), 'mic': ((44 + PAD, 27 + PAD), 'ffore'), 'ffist': ((44 + PAD, 27 + PAD), 'ffore'),
    'bthigh': ((28 + PAD, 40 + PAD), None), 'bshin': ((26 + PAD, 48 + PAD), 'bthigh'), 'bshoe': ((24 + PAD, 55 + PAD), 'bshin'),
    'fthigh': ((36 + PAD, 40 + PAD), None), 'fshin': ((39 + PAD, 48 + PAD), 'fthigh'), 'fshoe': ((40 + PAD, 55 + PAD), 'fshin'),
}

def composite(P, hide=()):
    """All the parts stacked in ORDER (minus `hide`)."""
    out = np.zeros((SIZE, SIZE, 4), np.uint8)
    for n in ORDER:
        if n in hide or n not in P: continue
        a = P[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    row = Image.new('RGBA', (SIZE * 3, SIZE), (120, 160, 220, 255))
    for i, v in enumerate(VARIANTS):
        VARIANT = v
        row.alpha_composite(Image.fromarray(composite(draw_parts())), (i * SIZE, 0))
    row.resize((SIZE * 3 * 6, SIZE * 6), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'gnash_preview.png')
