"""GNASH - a horned brute with a jagged grin and an axe as big as he is (Mason's sketch: "heavy, very hard hitting").
His drawing, part by part, on NU's rig and joints (tools/sprites/nu_draw.py) so nu_moves.py's poses fit him; his own
idle, specials, Limit and taunt are in gnash_moves.py.

An original design from Mason's notebook page: a big round head - pale as bone - split by a huge zig-zag grin of
jagged teeth, two little red eyes squinting over it, a pair of curved horns sweeping up off either side and a
little stalk sticking out of the top of his skull with a cross-in-a-ring on the end; a boxy black vest studded with
gold stars over a barrel chest; thick arms; heavy trousers and big boots; and THE AXE - a long haft wrapped in red
cord and a giant crescent blade whose back is a row of jagged spikes like a dragon's spine, its edge glowing hot.

Costumes (VARIANTS, `--set`): BLOODMOON (red-black: a crimson vest, black horns, a molten-orange blade) and
GRAVESTONE (all greys: a granite skin, a moss-green vest, a weathered stone axe).

Every part is a 64x64 layer, facing right, feet on row 58, shaded like NU (`shade5`).
"""
import numpy as np
import legs_kit as LK
from PIL import Image, ImageDraw
from nu_draw import hx, shade5, put, limb, blank

BASE = {
    'skin': (0xfff8ec, 0xf0e4d0, 0xd4c4a8, 0x9a8a70, 0x3a3024),
    'horn': (0xb05a5a, 0x8a3434, 0x641e24, 0x3e0e14, 0x140406),
    'vest': (0x5a5468, 0x3a3448, 0x26222e, 0x18141e, 0x08060c),
    'star': (0xfff4b0, 0xffe060, 0xf0b020, 0xa86a10, 0x4a2a04),
    'pants': (0x6a6a7a, 0x4a4a5a, 0x343444, 0x22222e, 0x0c0c14),
    'boot': (0x5a4a40, 0x3a2e28, 0x241c18, 0x16100e, 0x060404),
    'steel': (0xd8dce8, 0xa8b0c0, 0x7a8294, 0x4a5064, 0x1a1c28),
    'haft': (0xa06a3a, 0x7a4a24, 0x5a3418, 0x3a200c, 0x180c04),
    'cord': (0xff8a7a, 0xe03a3a, 0xa8202a, 0x70101a, 0x30040a),
    'eye': (0xffd0c0, 0xff5a3a, 0xe0201a, 0x900a0a, 0x3a0404),
    'edge': (0xffffe0, 0xffe080, 0xffa030, 0xd05a10, 0x601a04),
}
VARIANTS = {
    'default': {},
    'bloodmoon': {'pal': {
        'vest': (0xff7a7a, 0xd02a3a, 0x9a1424, 0x600a14, 0x24040a), 'horn': (0x5a5468, 0x3a3448, 0x26222e, 0x18141e, 0x08060c),
        'star': (0x5a5468, 0x3a3448, 0x26222e, 0x18141e, 0x08060c), 'steel': (0x8a7a7a, 0x5a4a4a, 0x3a2a2e, 0x24181c, 0x0c0608),
        'edge': (0xfff0a0, 0xffb040, 0xff6a10, 0xc03a0a, 0x501004), 'cord': (0x6a6a7a, 0x4a4a5a, 0x343444, 0x22222e, 0x0c0c14),
    }, 'crack': True},
    'gravestone': {'pal': {
        'skin': (0xe0e4e8, 0xb8bec8, 0x9098a4, 0x646a78, 0x24283a), 'vest': (0x9ac88a, 0x6a9a5a, 0x4a7240, 0x2e4a28, 0x10200c),
        'horn': (0xc8ccd4, 0x9aa0ac, 0x707684, 0x484c5a, 0x1a1c24), 'steel': (0xb8bec8, 0x8e96a2, 0x6a7280, 0x464c5a, 0x1a1c24),
        'edge': (0xd8f0c8, 0xa8d898, 0x7ab868, 0x4a8a3a, 0x1a3a10), 'star': (0xc8ccd4, 0x9aa0ac, 0x707684, 0x484c5a, 0x1a1c24),
        'eye': (0xd8ffc8, 0x8aff6a, 0x3ad82a, 0x1a8a10, 0x043a04), 'haft': (0x8a8a94, 0x6a6a76, 0x4a4a56, 0x2e2e38, 0x101016),
    }, 'moss': True},
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

def star(a, x, y, col, big=False):
    """A little five-point star of pixels centred on (x, y)."""
    pts = ([(x, y - 2), (x - 2, y - 1), (x - 1, y - 1), (x, y - 1), (x + 1, y - 1), (x + 2, y - 1), (x - 1, y), (x, y), (x + 1, y), (x - 1, y + 1), (x + 1, y + 1)] if big
           else [(x, y - 1), (x - 1, y), (x, y), (x + 1, y), (x - 1, y + 1), (x + 1, y + 1)])
    put(a, pts, col)

def draw_parts():
    """GNASH (or the costume in VARIANT): every part as a 64x64 RGBA array."""
    P = pal(); V = VARIANTS[VARIANT]; parts = {}
    # ---------------- legs: heavy trousers, big boots
    for side, hip, knee, ank in (('b', (28, 40), (26, 48), (24, 55)), ('f', (36, 40), (39, 48), (40, 55))):
        a = layer(lambda d, c: LK.seg(d, hip, knee, 8, 7, c, bulge=1.0, at=0.5), 'pants')
        put(a, LK.along(hip, knee, 1, 0.3, 0.9, 3), P['pants'][3]); parts[side + 'thigh'] = a
        a = layer(lambda d, c: LK.seg(d, knee, (ank[0], ank[1] - 2), 7, 7, c, bulge=0.4, at=0.3), 'pants')
        put(a, LK.along(knee, ank, -1, 0.2, 0.6, 2), P['pants'][3]); parts[side + 'shin'] = a
        a = layer(lambda d, c: LK.shoe(d, ank, c, 'boot', length=9), 'boot')
        put(a, [(x, 58) for x in range(ank[0] - 4, ank[0] + 10)], P['boot'][4]); put(a, [(ank[0] + 5, 54), (ank[0] + 6, 54)], P['boot'][0])
        parts[side + 'shoe'] = a
    # ---------------- the back arm: thick, bare, a fist
    parts['bupper'] = layer(lambda d, c: limb(d, (27, 24), (24, 31), 6, c), 'skin')
    a = layer(lambda d, c: limb(d, (24, 31), (24, 37), 5, c), 'skin')
    a = over(a, layer(lambda d, c: d.ellipse([21, 35, 27, 41], fill=c), 'skin')); put(a, [(22, 38), (23, 38), (24, 38)], P['skin'][3])
    parts['bfore'] = a
    # ---------------- the torso: a boxy black vest studded with gold stars over a barrel chest
    def vest(d, c):
        d.polygon([(26, 21), (40, 21), (43, 24), (43, 33), (41, 41), (27, 41), (25, 37), (24, 28)], fill=c)
    a = layer(vest, 'vest')
    chest = layer(lambda d, c: d.polygon([(32, 21), (37, 21), (35, 27), (34, 27)], fill=c), 'skin')   # his chest showing in the vest's V
    a = over(a, chest)
    for (x, y, b) in [(29, 26, True), (39, 28, True), (31, 34, False), (37, 36, False), (28, 39, False), (40, 33, False)]: star(a, x, y, P['star'][1 if b else 2], b)
    put(a, [(x, 40) for x in range(27, 42)], P['vest'][4]); put(a, [(x, 39) for x in range(27, 42, 3)], P['star'][2])   # a studded belt
    if V.get('moss'): put(a, [(26, 22), (27, 22), (28, 21), (40, 22), (41, 23), (25, 30), (25, 31)], 0x4a8a3a)
    parts['torso'] = a
    # ---------------- the head: a big round bone-pale skull, the zig-zag grin, little red eyes
    a = layer(lambda d, c: d.ellipse([27, 6, 42, 22], fill=c), 'skin')
    put(a, [(29, 9), (30, 8), (31, 8)], P['skin'][0])                                                    # a shine up top
    for y, x0, x1 in ((15, 29, 43), (16, 29, 43), (17, 29, 43), (18, 30, 42)): put(a, [(x, y) for x in range(x0, x1)], 0x0a0406)   # the grin: ear to ear
    for x in (29, 33, 37, 41): put(a, [(x - 1, 15), (x, 15), (x + 1, 15), (x, 16)], 0xfff8e8)                 # jagged teeth, top...
    for x in (31, 35, 39): put(a, [(x - 1, 18), (x, 18), (x + 1, 18), (x, 17)], 0xfff8e8)                    # ...and bottom, between them
    put(a, [(29, 14), (42, 14), (28, 15), (43, 15)], 0x0a0406)                                                # the corners curl up
    put(a, [(35, 11), (36, 11), (39, 11), (40, 11)], P['eye'][2]); put(a, [(36, 11), (40, 11)], P['eye'][0])   # eyes
    put(a, [(34, 10), (35, 10), (38, 10), (39, 10), (40, 10)], P['skin'][4])                            # a scowl over them
    if V.get('crack'): put(a, [(31, 7), (31, 8), (32, 9), (32, 10), (33, 11)], 0x600a14)
    if V.get('moss'): put(a, [(28, 9), (29, 8), (28, 10)], 0x4a8a3a)
    parts['head'] = a
    # ---------------- the 'hair' slot: two curved horns and the little stalk with a cross-in-a-ring
    im = blank(); d = ImageDraw.Draw(im); c = hx(P['horn'][2])
    d.polygon([(28, 11), (25, 8), (23, 4), (23, 1), (25, 3), (28, 6), (30, 8)], fill=c)                     # the back horn
    d.polygon([(40, 9), (43, 6), (45, 2), (46, 0), (47, 3), (45, 8), (42, 11)], fill=c)                      # the front horn
    a = shade5(np.array(im), P['horn'])
    put(a, [(23, 1), (46, 0)], P['horn'][4])
    stalk = layer(lambda d, c: (d.line([(33, 7), (31, 3)], fill=c, width=1), d.ellipse([28, 0, 32, 4], outline=c)), 'steel')
    put(stalk, [(30, 0), (30, 1), (30, 2), (30, 3), (30, 4), (28, 2), (29, 2), (31, 2), (32, 2)], P['steel'][1])   # the cross in the ring
    parts['hair'] = over(a, stalk)
    # ---------------- the front arm and THE AXE (in the 'mic' slot): a long corded haft, a giant spiked crescent blade
    parts['fupper'] = layer(lambda d, c: limb(d, (38, 24), (42, 31), 6, c), 'skin')
    parts['ffore'] = layer(lambda d, c: limb(d, (42, 31), (44, 27), 5, c), 'skin')
    h = layer(lambda d, c: d.line([(44, 34), (47, 3)], fill=c, width=3), 'haft')
    for y in range(24, 33, 2): put(h, [(44, y), (45, y), (46, y)], P['cord'][2 if y % 4 else 1])         # the cord wrap at the grip
    put(h, [(44, 35), (45, 35)], P['steel'][2])                                                           # the pommel
    import math
    cx, cy = 47, 13                                                                                        # the blade: a crescent off the haft, its edge a row of big jagged spikes
    def blade(d, c):
        pts = []
        for i in range(15):
            q = -1.45 + i * (2.9 / 14); r = 16 if i % 2 else 11.5
            pts.append((cx + math.cos(q) * r, cy + math.sin(q) * r * 0.95))
        inner = [(cx + 1 + math.cos(q) * 4, cy + math.sin(q) * 7) for q in (1.2, 0.4, -0.4, -1.2)]
        d.polygon(pts + inner, fill=c)
    b = layer(blade, 'steel')
    for i in range(1, 15, 2):                                                                             # the spikes' tips glow
        q = -1.45 + i * (2.9 / 14)
        for rr, col in ((15, P['edge'][1]), (13.5, P['edge'][2])): put(b, [(round(cx + math.cos(q) * rr), round(cy + math.sin(q) * rr * 0.95))], col)
    for (x, y) in [(52, 7), (54, 12), (52, 17)]: put(b, [(x, y), (x + 1, y)], P['steel'][4])              # notches
    put(b, [(50, 3), (51, 4), (52, 4)], P['steel'][0])
    put(b, [(50, 4), (51, 3), (52, 3)], P['steel'][0])
    if V.get('crack'): put(b, [(54, 5), (55, 7), (54, 9), (56, 12), (55, 14)], P['edge'][2])
    if V.get('moss'): put(b, [(51, 2), (52, 2), (53, 2), (48, 5)], 0x4a8a3a)
    parts['mic'] = over(h, b)
    a = layer(lambda d, c: d.ellipse([41, 24, 48, 30], fill=c), 'skin'); put(a, [(42, 27), (43, 27), (44, 27), (45, 27)], P['skin'][3])
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
