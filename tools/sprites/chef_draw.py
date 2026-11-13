"""CHEF ROUX - a hot-tempered master chef (a TEST FIGHTER). His drawing, part by part, on NU's rig and joints
(tools/sprites/nu_draw.py) so nu_moves.py's poses fit him; his own specials are in chef_moves.py.

An original design: a big, barrel-chested cook with a tall pleated toque (the 'hair' slot, so it wobbles on
his head), a ruddy face with a huge black handlebar moustache, bushy brows and a big nose; a white double-
breasted chef's jacket with two rows of buttons and a red neckerchief; a long white apron (its own part,
'apron', tied at the waist - it flaps with every move); houndstooth trousers and black clogs; sleeves rolled
up; a frying pan in his back hand (drawn with the back forearm) and a heavy cleaver in the front one ('mic' slot).

Costumes (VARIANTS, picked by `--set`): GRILL MASTER (a black jacket and toque, a ginger moustache, a red
bandana, an apron licked with flames, a cleaver with a red-hot edge) and PATISSIER (a pastel pink jacket, a
mint apron with a cherry, a cream toque, a big whisk instead of the cleaver, a cake-tin instead of the pan).

Every part is a 64x64 layer, facing right, feet on row 58, shaded like NU (`shade5`).
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import hx, shade5, put, limb, blank

BASE = {
    'skin': (0xffd8c0, 0xf4b898, 0xdc9474, 0xa86450, 0x4a2418),
    'stache': (0x5a5068, 0x3a3048, 0x221c2c, 0x14101a, 0x060408),
    'toque': (0xffffff, 0xfafafe, 0xe4e4ee, 0xb4b4c4, 0x54546a),
    'jacket': (0xffffff, 0xfafafe, 0xe4e4ee, 0xb4b4c4, 0x54546a),
    'apron': (0xffffff, 0xf6f6fa, 0xdedee8, 0xacacbc, 0x4c4c60),
    'kerchief': (0xff8a7a, 0xf03a3a, 0xc0202a, 0x80101a, 0x38040a),
    'pants': (0x6a6a7a, 0x4a4a5a, 0x343444, 0x22222e, 0x0c0c14),
    'clog': (0x5a4a40, 0x3a2e28, 0x241c18, 0x16100e, 0x060404),
    'steel': (0xffffff, 0xe0e6ee, 0xb0bac8, 0x748094, 0x2a3040),
    'wood': (0xc89060, 0xa06a3a, 0x7a4a24, 0x523016, 0x241206),
    'pan': (0x6a6a7a, 0x48485a, 0x2e2e3e, 0x1c1c28, 0x08080e),
    'button': (0xffffff, 0xf0f0f4, 0xc8c8d0, 0x8a8a98, 0x3a3a48),
}
VARIANTS = {
    'default': {},
    'grill': {'pal': {
        'jacket': (0x5a5468, 0x3a3448, 0x26222e, 0x18141e, 0x08060c), 'toque': (0x5a5468, 0x3a3448, 0x26222e, 0x18141e, 0x08060c),
        'apron': (0x6a5040, 0x4a3628, 0x34241a, 0x221610, 0x0c0604), 'stache': (0xffb070, 0xe8803a, 0xc05a1a, 0x803a0a, 0x3a1804),
        'kerchief': (0xffd060, 0xffa020, 0xe06a10, 0xa04008, 0x481a02), 'steel': (0xffe0c0, 0xffa060, 0xe06020, 0x9a3a10, 0x401404),
    }, 'flames': True},
    'pastry': {'pal': {
        'jacket': (0xffffff, 0xffe4f0, 0xffc4dc, 0xd88aa8, 0x6a2a48), 'toque': (0xffffff, 0xfff6e8, 0xf4e4c8, 0xc8b490, 0x5a4a30),
        'apron': (0xf0fff8, 0xc8f4e0, 0xa0e0c4, 0x68b090, 0x2a5a44), 'stache': (0xc89060, 0xa06a3a, 0x7a4a24, 0x523016, 0x241206),
        'kerchief': (0xffffff, 0xfff6e8, 0xf4e4c8, 0xc8b490, 0x5a4a30), 'pants': (0xd8c8e8, 0xb8a4cc, 0x9480ac, 0x645480, 0x2a2040),
        'pan': (0xf4f4fa, 0xd8dce8, 0xb0b8c8, 0x7a849a, 0x2a3040),
    }, 'whisk': True, 'cherry': True},
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

def draw_parts():
    """CHEF ROUX (or the costume in VARIANT): every part as a 64x64 RGBA array."""
    P = pal(); V = VARIANTS[VARIANT]; parts = {}
    # ---------------- legs: houndstooth trousers, black clogs
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 54)), ('f', (37, 40), (40, 48), (40, 54))):
        for nm, a0, b0 in (('thigh', hip, knee), ('shin', knee, ank)):
            a = layer(lambda d, c: limb(d, a0, b0, 6, c), 'pants')
            ys, xs = np.nonzero(a[..., 3])
            for y, x in zip(ys, xs):                                                           # the houndstooth check
                if (x + y) % 3 == 0 and (x * 2 + y) % 4 == 0 and not np.all(a[y, x, :3] == np.array(hx(P['pants'][4])[:3])): a[y, x] = hx(P['pants'][0])
            parts[side + nm] = a
        x0 = ank[0] - 4
        a = layer(lambda d, c: d.polygon([(x0, 53), (x0 + 7, 53), (x0 + 10, 55), (x0 + 10, 58), (x0, 58)], fill=c), 'clog')
        put(a, [(x, 58) for x in range(x0, x0 + 11)], P['clog'][4]); put(a, [(x0 + 7, 55)], P['clog'][0])
        parts[side + 'shoe'] = a
    # ---------------- the back arm: rolled sleeve, bare forearm, a frying pan (PATISSIER: a cake tin)
    parts['bupper'] = layer(lambda d, c: limb(d, (27, 24), (25, 31), 5, c), 'jacket')
    a = layer(lambda d, c: limb(d, (25, 31), (26, 36), 4, c), 'skin')
    put(a, [(24, 31), (25, 31), (26, 31), (27, 31)], P['jacket'][3])                                   # the rolled cuff
    pan = layer(lambda d, c: (d.line([(26, 38), (21, 43)], fill=c, width=2)), 'wood')
    disc = layer(lambda d, c: d.ellipse([12, 41, 23, 50], fill=c), 'pan')
    put(disc, [(15, 44), (16, 43), (17, 43)], P['pan'][0]); put(disc, [(19, 48), (20, 47)], P['pan'][3])
    a = over(over(a, pan), disc)
    a = over(a, layer(lambda d, c: d.ellipse([24, 36, 28, 40], fill=c), 'skin'))
    parts['bfore'] = a
    # ---------------- the torso: a white double-breasted jacket, two rows of buttons, a red neckerchief, a big belly
    def jacket(d, c):
        d.polygon([(28, 21), (37, 21), (40, 24), (41, 31), (40, 38), (38, 41), (28, 41), (26, 37), (26, 30), (27, 23)], fill=c)
    a = layer(jacket, 'jacket')
    for y in (26, 30, 34): put(a, [(33, y), (37, y)], P['button'][2]); put(a, [(33, y - 1), (37, y - 1)], P['button'][0])
    put(a, [(35, y) for y in range(23, 40)], P['jacket'][3])                                           # the overlap seam
    put(a, [(29, 25), (29, 26)], P['jacket'][1]); put(a, [(39, 31), (39, 32), (38, 35)], P['jacket'][3])
    k = layer(lambda d, c: d.polygon([(31, 20), (37, 20), (36, 23), (34, 25), (32, 23)], fill=c), 'kerchief')
    a = over(a, k)
    if VARIANT == 'grill': put(a, [(x, 22) for x in range(30, 38)], P['kerchief'][1])
    parts['torso'] = a
    # ---------------- the apron: tied at the waist, falling to his knees (its own part so it flaps)
    a = layer(lambda d, c: d.polygon([(29, 35), (39, 35), (41, 47), (40, 50), (29, 50), (28, 47)], fill=c), 'apron')
    put(a, [(x, 35) for x in range(29, 40)], P['apron'][3]); put(a, [(28, 36), (27, 37), (27, 38)], P['apron'][3])   # the tie at the back
    put(a, [(33, y) for y in range(40, 49, 2)], P['apron'][3])
    if V.get('flames'):
        for (x, y) in [(30, 49), (31, 47), (32, 49), (33, 46), (34, 48), (35, 45), (36, 48), (37, 46), (38, 49), (39, 47)]:
            put(a, [(x, y), (x, y + 1)], 0xff7a1a); put(a, [(x, y + 2)], 0xffd040)
    if V.get('cherry'): put(a, [(36, 40), (37, 40), (36, 41), (37, 41)], 0xe0203a); put(a, [(37, 38), (38, 39)], 0x2a6a2a); put(a, [(36, 40)], 0xff8a9a)
    parts['apron'] = a
    # ---------------- the head: ruddy, a big nose, bushy brows, the handlebar moustache
    def face(d, c):
        d.rectangle([31, 17, 35, 21], fill=c)
        d.polygon([(30, 9), (38, 9), (39, 12), (40, 15), (39, 18), (37, 20), (32, 20), (30, 17)], fill=c)
    a = layer(face, 'skin')
    put(a, [(36, 12), (37, 12), (38, 11)], P['stache'][2]); put(a, [(36, 13)], 0x2a2030); put(a, [(37, 13)], 0xffffff)   # brow, eye
    put(a, [(39, 14), (40, 14), (40, 15), (41, 15)], P['skin'][2]); put(a, [(40, 14)], P['skin'][1]); put(a, [(41, 15)], P['skin'][3])   # the big nose
    put(a, [(34, 15), (35, 15)], 0xff8a8a)                                                              # rosy cheek
    stache = [(36, 16), (37, 16), (38, 16), (39, 16), (40, 16), (35, 17), (36, 17), (39, 17), (40, 17), (41, 17), (34, 16), (34, 15)]
    put(a, stache, P['stache'][2]); put(a, [(37, 16), (38, 16)], P['stache'][1])
    for (x, y) in [(42, 16), (43, 15), (44, 14)]:                                                        # its curled tip, past the face
        a[y, x] = hx(P['stache'][2])
    put(a, [(38, 18)], 0x8a3a3a)                                                                        # mouth
    put(a, [(31, 13), (31, 14)], P['skin'][3])                                                          # ear
    parts['head'] = a
    # ---------------- the toque ('hair' slot): a tall pleated white chef's hat (GRILL MASTER: a red bandana under it)
    def toque(d, c):
        d.rectangle([30, 6, 38, 10], fill=c)
        d.ellipse([28, -1, 41, 8], fill=c)
    a = layer(toque, 'toque')
    for x in (31, 33, 35, 37): put(a, [(x, y) for y in range(3, 10)], P['toque'][3])                  # the pleats
    put(a, [(x, 9) for x in range(30, 39)], P['toque'][3])
    if VARIANT == 'grill': put(a, [(x, 10) for x in range(30, 39)], 0xe03a2a); put(a, [(29, 11), (28, 12)], 0xe03a2a)
    if V.get('cherry'): put(a, [(34, 0), (35, 0), (34, 1), (35, 1)], 0xe0203a); put(a, [(34, 0)], 0xff8a9a)
    parts['hair'] = a
    # ---------------- the front arm, the cleaver (PATISSIER: a whisk), the fist
    parts['fupper'] = layer(lambda d, c: limb(d, (38, 24), (42, 31), 5, c), 'jacket')
    a = layer(lambda d, c: limb(d, (42, 31), (44, 27), 4, c), 'skin')
    put(a, [(41, 30), (42, 30), (43, 30)], P['jacket'][3])
    parts['ffore'] = a
    if V.get('whisk'):
        h = layer(lambda d, c: d.line([(44, 29), (46, 22)], fill=c, width=2), 'wood')
        im = blank(); d = ImageDraw.Draw(im)
        for i, col in ((0, P['steel'][3]), (2, P['steel'][1]), (4, P['steel'][0])): d.ellipse([43 + i // 2, 10, 51 - i // 2, 23], outline=hx(col))   # the wire loops
        a = over(np.array(im), h)
    else:
        h = layer(lambda d, c: d.line([(44, 29), (45, 23)], fill=c, width=2), 'wood')
        blade = layer(lambda d, c: d.polygon([(43, 23), (52, 21), (53, 14), (44, 15)], fill=c), 'steel')
        put(blade, [(52, 15), (52, 16), (52, 17), (52, 18), (52, 19), (52, 20)], P['steel'][0])        # the edge
        put(blade, [(45, 17)], P['steel'][4])                                                            # the hole
        a = over(blade, h)
    parts['mic'] = a
    a = layer(lambda d, c: d.ellipse([42, 23, 47, 28], fill=c), 'skin'); put(a, [(43, 25), (44, 25), (45, 25)], P['skin'][3])
    parts['ffist'] = a
    return parts

ORDER = ['bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'apron', 'head', 'hair', 'fupper', 'ffore', 'mic', 'ffist']
RIG = {
    'torso': ((32, 39), None), 'apron': ((34, 36), 'torso'),
    'head': ((33, 21), 'torso'), 'hair': ((33, 21), 'head'),
    'bupper': ((27, 24), 'torso'), 'bfore': ((25, 31), 'bupper'),
    'fupper': ((38, 24), 'torso'), 'ffore': ((42, 31), 'fupper'), 'mic': ((44, 26), 'ffore'), 'ffist': ((44, 26), 'ffore'),
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
    row.resize((64 * 3 * 8, 64 * 8), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'chef_preview.png')
