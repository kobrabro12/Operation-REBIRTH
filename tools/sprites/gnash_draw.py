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
    # the three map costumes (each named for a stage, drawn after it):
    'arcade': (0xff3fd0, 0x3af0ff, 0xffc85a),       # HIGH SCORE - NEON ARCADE's synthwave: hot pink, cyan, the striped sun
    'gravemoon': (0x8aa8ff, 0xff3a3a, 0xe6eaff),    # GRAVEMOON - GRAVEMOON BRIDGE: moonlit blue, the gargoyles' red eyes, the moon
    'infected': (0xff2a8a, 0xff2a2a, 0xff7ab0),     # INFECTED.EXE - the old PC: ILOVEYOU pink, THE RED ROOM's red, a love-letter heart
    'pop': (0x000000, 0x000000, 0xe8281e),          # POP LINES - in the style of 80s subway pop art: thick black lines, flat bright colours
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
    # HIGH SCORE: a purple-black synthwave jacket, a striped sunset sun on his tee and in his axe, sunset-gradient horns,
    # scanlines across the mask, a little arcade joystick pinned to his jacket
    'arcade': {'horn': 'sunh', 'emblem': 'sun', 'pal': {
        'jacket': (0x6a4a90, 0x44286a, 0x2a1648, 0x160a28, 0xff3fd0), 'jeans': (0x3a3a72, 0x26265a, 0x181840, 0x0c0c24, 0xff3fd0),
        'hair': (0xff9ae8, 0xd84ab0, 0x9a2a88, 0x5a1452, 0x1a0418), 'glass': (0x6a4a90, 0x3a2458, 0x22143a, 0x140a24, 0x06020c),
        'sunh': (0xffffff, 0xffe56a, 0xffa058, 0xff3f86, 0x6a0a4a)}},
    # GRAVEMOON: carved like the bridge's gargoyles - a stone mask with a crack, red eyes and fangs, curled stone horns,
    # a slate jacket edged in moonlight, a red lantern swinging off his belt, and a full moon set into a stone axe
    'gravemoon': {'horn': 'mask', 'hornW': 5.2, 'emblem': 'moon', 'pal': {
        'mask': (0xd0d6e4, 0xa2aabe, 0x6e7290, 0x46485e, 0x0a0818), 'jacket': (0x6a6c8a, 0x4a4c68, 0x2e2e4a, 0x1a1a30, 0x8aa8ff),
        'hair': (0xe6eaff, 0xb8c0e0, 0x8a90b8, 0x5a5e86, 0x1a1a30), 'glass': (0xb3becd, 0x7c8098, 0x53566c, 0x38384f, 0x0a0818),
        'haft': (0x55526e, 0x3a384c, 0x2a2838, 0x15131f, 0x05040a), 'shoe': (0x545462, 0x383848, 0x26262f, 0x1a1a20, 0x8aa8ff), 'moon': (0xffffff, 0xe6eaff, 0xc2c8f0, 0x9ca4d8, 0x2c2c64)}},
    # INFECTED.EXE: the infected desktop - a title-bar-blue jacket with grey bevelled-window lining, an ILOVEYOU heart
    # on his tee and in his axe (a grey Windows window with a title bar and a close box), THE RED ROOM's crosshair
    # eyes, glitching horns, a corrupted line through the mask
    # POP LINES (after 80s subway pop art, Keith Haring-style): no shading at all - every part a flat bright colour
    # inside a thick black line: a red jacket, blue jeans, yellow high-tops, a white tee scribbled with black doodles,
    # a white mask with a black X-eyed grin, flat green horns, a yellow haft and a white blade with a big red heart
    # and black 'energy' dashes round it
    'pop': {'horn': 'popg', 'hornW': 4.4, 'emblem': 'pop', 'pal': {
        'jacket': (0xe8281e, 0xe8281e, 0xe8281e, 0xe8281e, 0x000000), 'tee': (0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x000000), 'jeans': (0x1e64d8, 0x1e64d8, 0x1e64d8, 0x1e64d8, 0x000000), 'shoe': (0xffd21e, 0xffd21e, 0xffd21e, 0xffd21e, 0x000000), 'mask': (0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x000000),
        'hair': (0x141414, 0x141414, 0x141414, 0x141414, 0x000000), 'popg': (0x2ec850, 0x2ec850, 0x2ec850, 0x2ec850, 0x000000), 'haft': (0xffd21e, 0xffd21e, 0xffd21e, 0xffd21e, 0x000000), 'glass': (0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x000000),
        'neon': (0x1a1a1a, 0x000000, 0x000000, 0x000000, 0x000000), 'neon2': (0x1a1a1a, 0x000000, 0x000000, 0x000000, 0x000000),
        'skin': (0xffd2b4, 0xffd2b4, 0xffd2b4, 0xffd2b4, 0x000000), 'stud': (0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x000000)}},
    'infected': {'horn': 'neon2', 'emblem': 'heart', 'glitch': True, 'pal': {
        'jacket': (0x2a6ad8, 0x1a4ab0, 0x0a2484, 0x061650, 0xff2a8a), 'tee': (0xfff6e8, 0xe0d0b8, 0xc0b098, 0x8a7a64, 0xff2a8a),
        'hair': (0x5af0e0, 0x2aa0a0, 0x108484, 0x0a6a6a, 0x022a2a), 'glass': (0xffffff, 0xc0c0c0, 0x9a9a9a, 0x6a6a6a, 0x0a0a12),
        'haft': (0xf0e8d0, 0xd8d0b8, 0xb0a88c, 0x7a745e, 0x2a2618)}},
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
        V = VARIANTS[VARIANT]
        if V.get('glitch'): h = over(h, horn([(x + 1, y) for x, y in line], 'neon2', V.get('hornW', 4.0)))   # a cyan ghost of each horn: the signal's split
        h = over(h, horn(line, V.get('horn', 'neon'), V.get('hornW', 4.0)))
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
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)); dd = ImageDraw.Draw(im)
    em = VARIANTS[VARIANT].get('emblem')
    if em: EMBLEMS[em](dd, P, dx0, dy0)                                                                                       # a map costume's own emblem instead
    else:
        dd.polygon(ring[:-1], fill=hx(P['neon3'][4])); dd.line(ring, fill=hx(P['neon3'][2]), width=2); dd.line(ring, fill=hx(P['neon3'][0]), width=1)
    dm = np.array(im); m = dm[..., 3] > 0; b[m] = dm[m]
    if VARIANT == 'infected':                                                                                                 # the blade as a Windows window
        for y in range(cy - 19, cy - 14):
            putB(b, [(x, y) for x in range(cx - 4, cx + 22)], 0x0a2484 if y > cy - 19 else 0x2a6ad8)                      # its title bar
        for x in range(cx + 13, cx + 17):
            putB(b, [(x, y) for y in range(cy - 18, cy - 15)], 0xc0c0c0)                                                  # the close box ...
        putB(b, [(cx + 14, cy - 17), (cx + 15, cy - 16), (cx + 15, cy - 17), (cx + 14, cy - 16)], 0x0a0a12)               # ... and its X
        putB(b, [(cx - 3 + i, cy + 2 + 6 * (i % 3)) for i in range(0, 24, 3)], 0x808080)                                   # cracks in the glass
    axe = over(hf, b)
    a = layer(lambda d, c: d.ellipse([41, 24, 48, 30], fill=c), 'skin'); put(a, [(41, 26), (42, 26), (43, 26), (44, 26), (45, 26), (46, 26), (47, 26)], P['jacket'][3])   # a fingerless glove
    put(a, [(42, 28), (43, 28), (44, 28), (45, 28)], P['skin'][3])
    parts['ffist'] = a
    if VARIANT in TOUCH: TOUCH[VARIANT](parts, P)                          # a map costume's own touches
    parts = {n: pad(v) for n, v in parts.items()}                         # everything onto the big canvas ...
    parts['mic'] = axe                                                      # ... where the axe was drawn
    return parts

# ---- the map costumes' emblems (in the axe blade, where the diamond is) and touches (on the 64x64 parts)
SUN = (0xffe56a, 0xffc85a, 0xffa058, 0xff7a62, 0xff5a72, 0xff3f86)

def emblem_sun(d, P, x, y):
    """HIGH SCORE: a striped synthwave sun - bands of yellow to pink, with gaps through its lower half."""
    r = 7
    d.ellipse([x - r - 1, y - r - 1, x + r + 1, y + r + 1], fill=hx(0x6a0a4a))
    for j in range(-r, r + 1):
        if j > 0 and j % 3 == 1: continue
        w = int(math.sqrt(max(0, r * r - j * j)) + 0.5); band = SUN[min(5, (j + r) * 6 // (2 * r + 1))]
        d.line([(x - w, y + j), (x + w, y + j)], fill=hx(band))
    d.point([(x - 2, y - 5), (x - 3, y - 4)], fill=hx(0xffffff))

def emblem_moon(d, P, x, y):
    """GRAVEMOON: a full moon set in the stone, craters and a blue halo."""
    M = P['moon']; r = 7
    d.ellipse([x - r - 1, y - r - 1, x + r + 1, y + r + 1], fill=hx(0x7470d0))
    d.ellipse([x - r, y - r, x + r, y + r], fill=hx(M[2])); d.ellipse([x - r, y - r, x + r - 2, y + r - 2], fill=hx(M[1]))
    for cx, cy, cr in ((x + 2, y - 2, 2), (x - 3, y + 2, 1), (x + 1, y + 4, 1)): d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=hx(M[3]))
    d.point([(x - 4, y - 4), (x - 3, y - 5)], fill=hx(M[0]))

def emblem_heart(d, P, x, y):
    """INFECTED.EXE: ILOVEYOU's pixel heart."""
    rows = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....']
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c == '#': d.point((x - 4 + i, y - 4 + j), fill=hx(0xff7ab0 if (i + j) % 5 else 0xff2a5a))
    d.point([(x - 3, y - 3), (x - 2, y - 3), (x - 3, y - 2)], fill=hx(0xffffff))
def emblem_pop(d, P, x, y):
    """POP LINES: a big flat red heart in a thick black line, black dashes bursting out round it."""
    rows = ['.###...###.', '#####.#####', '###########', '###########', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....']
    pts = [(x - 5 + i, y - 4 + j) for j, r in enumerate(rows) for i, c in enumerate(r) if c == '#']
    for (px, py) in pts:
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)): d.point((px + ox, py + oy), fill=hx(0x000000))
    for (px, py) in pts: d.point((px, py), fill=hx(0xe8281e))
    for q in range(8):                                                              # the energy dashes
        a = q * math.pi / 4; c, si = math.cos(a), math.sin(a)
        d.line([(x + c * 9, y + si * 9), (x + c * 12, y + si * 12)], fill=hx(0x000000), width=1)

EMBLEMS = {'pop': emblem_pop, 'sun': emblem_sun, 'moon': emblem_moon, 'heart': emblem_heart}

def touch_arcade(parts, P):
    """HIGH SCORE: the sun on his tee, scanlines on his mask, a joystick pin."""
    t = parts['torso']
    for j, y in enumerate(range(27, 34)):
        if j in (4, 6): continue
        put(t, [(x, y) for x in range(32, 37)], SUN[min(5, j)])
    put(t, [(39, 30), (40, 30), (39, 31), (40, 31)], 0x14042a); put(t, [(39, 29), (40, 29)], 0xff3a3a); put(t, [(40, 28)], 0xffffff)
    h = parts['head']; M = P['mask']
    for y in range(7, 22, 2):
        for x in range(26, 43):
            if tuple(h[y, x, :3]) == tuple(hx(M[2])[:3]): h[y, x] = hx(M[3])

def touch_gravemoon(parts, P):
    """GRAVEMOON: a cracked stone face with fangs, and a red lantern on his belt."""
    h = parts['head']; M = P['mask']
    put(h, [(37, 6), (36, 7), (36, 8), (35, 9), (36, 10), (35, 11)], M[4])                      # the crack
    for x in range(28, 42):                                                                    # the grin: a dark stone mouth ...
        for y in range(13, 19):
            if h[y, x, 3] and tuple(h[y, x, :3]) == tuple(hx(P['neon'][1])[:3]): h[y, x] = hx(M[4])
    for fx in (31, 35, 39): put(h, [(fx, 15), (fx, 16)], 0xffffff); put(h, [(fx, 17)], 0xd0d6e4)  # ... and its fangs
    t = parts['torso']                                                                         # the lantern, hung off his belt
    paint(t, [(28, 41), (29, 41), (28, 42)], 0x15131f)
    paint(t, [(x, y) for x in range(26, 31) for y in (43, 48)], 0x24182a)
    paint(t, [(x, y) for x in (26, 30) for y in range(43, 49)], 0x24182a)
    paint(t, [(x, y) for x in range(27, 30) for y in range(44, 48)], 0xff6a20); paint(t, [(28, 45), (28, 46)], 0xffc060)
    put(t, [(39, 30), (40, 30), (40, 31)], 0xe6eaff); put(t, [(39, 31)], 0x8aa8ff)              # a crescent pin

def touch_infected(parts, P):
    """INFECTED.EXE: the heart on his tee, THE RED ROOM's crosshairs for eyes, a corrupted line, a bevelled collar."""
    t = parts['torso']
    for j, r in enumerate(['#.#', '###', '.#.']):
        put(t, [(33 + i, 29 + j) for i, c in enumerate(r) if c == '#'], 0xff2a5a)
    put(t, [(28, 21), (29, 20), (38, 20), (39, 21), (27, 22), (40, 22)], 0xc0c0c0); put(t, [(28, 20), (38, 19)], 0xffffff)
    h = parts['head']; M = P['mask']
    for cx in (33, 39):                                                                        # the crosshairs (over the X eyes)
        for y in range(7, 14):
            for x in range(cx - 3, cx + 4):
                if h[y, x, 3]: h[y, x] = hx(M[2])
        ring = [(cx - 1, 8), (cx, 8), (cx + 1, 8), (cx - 2, 9), (cx + 2, 9), (cx - 2, 10), (cx + 2, 10), (cx - 2, 11), (cx + 2, 11), (cx - 1, 12), (cx, 12), (cx + 1, 12)]
        put(h, ring, 0xff2a2a); put(h, [(cx, 7), (cx, 13), (cx - 3, 10), (cx + 3, 10)], 0xff7a7a); put(h, [(cx, 10)], 0xffffff)
    row = h[15].copy(); h[15] = 0; h[15, 2:] = row[:-2]                                        # one scanline slipped sideways ...
    for x in range(26, 44):
        if h[15, x, 3] and not h[15, x - 1, 3]: h[15, x] = hx(0x3af0ff)                         # ... with a cyan fringe
    put(h, [(29, 19), (30, 19), (40, 10), (41, 10)], 0x3af0ff)                                 # dead pixels

def touch_pop(parts, P):
    """POP LINES: black doodles scribbled on his white tee, black stitch dashes on the jacket and jeans."""
    t = parts['torso']
    put(t, [(x, y) for x in range(32, 37) for y in range(22, 40)], 0xffffff)                    # (the tee white again under the print)
    put(t, [(32, 24), (33, 25), (34, 24), (35, 25), (36, 24)], 0x000000)                       # a zig-zag ...
    put(t, [(33, 28), (34, 28), (35, 28), (34, 29), (33, 30), (35, 30), (34, 31)], 0x000000)   # ... a little X-eyed face ...
    put(t, [(32, 34), (33, 35), (34, 34), (35, 35), (36, 34), (32, 37), (34, 37), (36, 37)], 0x000000)   # ... and dashes
    put(t, [(27, 26), (28, 28), (27, 31), (40, 26), (41, 28), (40, 32)], 0xffd21e)              # yellow dashes on the jacket
    for n in ('bthigh', 'fthigh', 'bshin', 'fshin'):
        a = parts[n]; ys, xs = np.nonzero(a[..., 3])
        if len(xs): cx = int(xs.mean()); put(a, [(cx, y) for y in range(int(ys.min()) + 2, int(ys.max()) - 1, 3)], 0xffffff)   # white dashes down the jeans

TOUCH = {'pop': lambda parts, P: touch_pop(parts, P), 'arcade': touch_arcade, 'gravemoon': touch_gravemoon, 'infected': touch_infected}

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
    row = Image.new('RGBA', (SIZE * len(VARIANTS), SIZE), (120, 160, 220, 255))
    for i, v in enumerate(VARIANTS):
        VARIANT = v
        row.alpha_composite(Image.fromarray(composite(draw_parts())), (i * SIZE, 0))
    row.resize((SIZE * len(VARIANTS) * 4, SIZE * 4), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'gnash_preview.png')
