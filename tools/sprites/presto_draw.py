"""THE GREAT PRESTO - a stage magician (a TEST FIGHTER). His drawing, part by part, on NU's rig and joints
(tools/sprites/nu_draw.py) so nu_moves.py's poses fit him; his own specials are in presto_moves.py.

An original design: a lean showman in a tall top hat with a crimson band (the 'hair' slot, so it bobs on his
head), slicked black hair, a sly face with violet eyes, a curled moustache and a pointed goatee; a black
tailcoat with crimson lapels over a white shirt and a violet bow tie; a long black cape lined with crimson
(its own part, 'cape', hung from his shoulders - it streams behind every move); white gloves; a black wand with
white tips (the 'mic' slot); striped trousers and patent shoes with white spats.

Costumes (VARIANTS, picked by `--set`): ROYAL FLUSH (an ivory tailcoat with gold trim, a red cape scattered with
card suits, a white hat with a playing card in its band, a gold wand) and THE PHANTOM (a ghost of the stage:
pale blue-grey skin, a white half-mask, glowing teal eyes, a ragged teal-lined cape and a battered hat).

Every part is a 64x64 layer, facing right, feet on row 58, shaded like NU (`shade5`: five tones, lit from the
upper left, each part outlined in its own darkest shade).
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import hx, shade5, put, limb, blank

# five tones per material: highlight, light, mid, shadow, outline
BASE = {
    'skin': (0xfff0e4, 0xf4dcc8, 0xdcbca4, 0xa88470, 0x4a3028),
    'hair': (0x5a5470, 0x3a3450, 0x24202e, 0x16121c, 0x08060c),
    'hat': (0x6a6480, 0x48425c, 0x2a2638, 0x1a1724, 0x08060e),
    'band': (0xff8a9a, 0xe83a52, 0xb8203a, 0x7a1024, 0x3a0610),
    'coat': (0x5e5874, 0x403a56, 0x2a2540, 0x1a1628, 0x0a0812),
    'lining': (0xff7a8a, 0xe02a48, 0xb01a34, 0x760c20, 0x34040c),
    'shirt': (0xffffff, 0xf4f2fa, 0xd8d4e4, 0xa8a2b8, 0x4a4658),
    'tie': (0xe0b0ff, 0xb070f0, 0x8a40d0, 0x5a2090, 0x2a0a48),
    'glove': (0xffffff, 0xf6f6fa, 0xdcdce6, 0xa8a8b8, 0x484858),
    'pants': (0x4a4660, 0x34304a, 0x24203a, 0x16142a, 0x08060e),
    'shoe': (0x8a8aa0, 0x4a4a5e, 0x24243a, 0x14142a, 0x060610),
    'wand': (0x6a6480, 0x3a3450, 0x1a1626, 0x0e0c16, 0x020206),
    'tip': (0xffffff, 0xffffff, 0xeeeef6, 0xb8b8c8, 0x58586a),
    'gold': (0xfff4b0, 0xffd860, 0xe0a830, 0xa06a18, 0x4a2a06),
}
EYE = (0xe8c8ff, 0xb070f0)
# the costumes: material swaps and their own touches
VARIANTS = {
    'default': {},
    'royal': {'pal': {
        'coat': (0xffffff, 0xf8f2e4, 0xe8dcc0, 0xbcaa88, 0x5a4a30), 'hat': (0xffffff, 0xf8f2e4, 0xe8dcc0, 0xbcaa88, 0x5a4a30),
        'band': BASE['gold'], 'tie': BASE['band'], 'lining': (0xff6a6a, 0xe8202a, 0xc0101a, 0x800810, 0x380206),
        'wand': BASE['gold'], 'tip': (0xffffff, 0xfff4f0, 0xffd860, 0xc09030, 0x5a3a08),
        'pants': (0xffffff, 0xf0eadc, 0xd8ccb0, 0xa89878, 0x4a3e28), 'shoe': (0xfff4b0, 0xffd860, 0xe0a830, 0xa06a18, 0x4a2a06),
    }, 'eye': (0xffe0a0, 0xe8a020), 'card': True, 'suits': True},
    'phantom': {'pal': {
        'skin': (0xe8f4fa, 0xc8dce8, 0xa0b8c8, 0x6a8094, 0x2a3a48), 'coat': (0x3a5a64, 0x24404a, 0x163038, 0x0c2026, 0x040e12),
        'hat': (0x3a5a64, 0x24404a, 0x163038, 0x0c2026, 0x040e12), 'band': (0x8affe8, 0x3ae0c0, 0x1aa890, 0x0a6a5a, 0x022a24),
        'lining': (0x8affe8, 0x3ae0c0, 0x1aa890, 0x0a6a5a, 0x022a24), 'tie': (0x8affe8, 0x3ae0c0, 0x1aa890, 0x0a6a5a, 0x022a24),
        'hair': (0xe8f4fa, 0xc8d8e4, 0xa0b0c0, 0x708090, 0x30404c), 'wand': (0xf4f0e0, 0xe0d8c0, 0xc0b498, 0x8a7c60, 0x3a3220),
        'tip': (0x8affe8, 0x3ae0c0, 0x1aa890, 0x0a6a5a, 0x022a24), 'pants': (0x2a4048, 0x1a2e36, 0x102028, 0x08141a, 0x02080a),
    }, 'eye': (0xd0fff4, 0x3ae0c0), 'mask': True, 'ragged': True},
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
    """THE GREAT PRESTO (or the costume in VARIANT): every part as a 64x64 RGBA array."""
    P = pal(); V = VARIANTS[VARIANT]; parts = {}
    # ---------------- the cape: hung from both shoulders, falling behind him to his knees, crimson lining showing
    def cape(d, c):
        pts = [(27, 20), (35, 21), (33, 26), (31, 36), (28, 46), (24, 52), (18, 53), (14, 50), (16, 40), (21, 28)]
        if V.get('ragged'): pts = pts[:5] + [(26, 50), (23, 47), (21, 52), (18, 48), (16, 51), (17, 44)] + pts[8:]
        d.polygon(pts, fill=c)
    a = layer(cape, 'coat')
    lin = layer(lambda d, c: d.polygon([(21, 30), (25, 26), (21, 42), (18, 51), (15, 49), (17, 40)], fill=c), 'lining')
    a = over(a, lin)
    put(a, [(24, 33), (23, 37), (22, 41)], P['coat'][3])                                               # folds
    if V.get('suits'):
        for (x, y) in [(20, 44), (21, 38), (19, 47)]: put(a, [(x, y), (x + 1, y), (x, y + 1)], 0xffffff)
    parts['cape'] = a
    # ---------------- legs: striped trousers, patent shoes with white spats
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 54)), ('f', (37, 40), (40, 48), (40, 54))):
        a = layer(lambda d, c: limb(d, hip, knee, 5, c), 'pants'); put(a, [(hip[0] + 1, y) for y in range(hip[1] + 1, knee[1])], P['pants'][3])
        parts[side + 'thigh'] = a
        a = layer(lambda d, c: limb(d, knee, ank, 5, c), 'pants'); put(a, [(knee[0] + (0 if side == 'b' else 0), y) for y in range(knee[1], ank[1])], P['pants'][3])
        parts[side + 'shin'] = a
        x0 = ank[0] - 3
        a = layer(lambda d, c: d.polygon([(x0, 54), (x0 + 5, 54), (x0 + 7, 56), (x0 + 9, 56), (x0 + 9, 58), (x0, 58)], fill=c), 'shoe')
        put(a, [(x0 + 1, 54), (x0 + 2, 54), (x0 + 3, 54), (x0 + 1, 55), (x0 + 2, 55), (x0 + 3, 55), (x0 + 4, 55)], 0xf4f2fa)    # the spats
        put(a, [(x0 + 7, 56)], 0xffffff); put(a, [(x, 58) for x in range(x0, x0 + 10)], P['shoe'][4])
        parts[side + 'shoe'] = a
    # ---------------- the back arm: a black sleeve and a white glove
    parts['bupper'] = layer(lambda d, c: limb(d, (27, 24), (25, 31), 4, c), 'coat')
    a = layer(lambda d, c: limb(d, (25, 31), (26, 35), 4, c), 'coat')
    a = over(a, layer(lambda d, c: d.ellipse([24, 35, 28, 39], fill=c), 'glove'))
    put(a, [(24, 34), (25, 34), (26, 34), (27, 34)], P['lining'][2])                                   # a crimson cuff
    parts['bfore'] = a
    # ---------------- the torso: a tailcoat (tails behind), crimson lapels, white shirt front, a violet bow tie, gold buttons
    def coat(d, c):
        d.polygon([(29, 21), (37, 21), (39, 23), (38, 31), (37, 37), (38, 41), (28, 41), (27, 37), (28, 31), (27, 23)], fill=c)
        d.polygon([(27, 36), (31, 38), (29, 48), (26, 50), (25, 44)], fill=c)                           # a coat tail
    a = layer(coat, 'coat')
    a = over(a, layer(lambda d, c: d.polygon([(32, 21), (36, 21), (35, 30), (34, 33), (33, 30)], fill=c), 'shirt'))
    put(a, [(31, 22), (31, 23), (32, 24), (32, 25), (32, 26), (33, 27), (33, 28)], P['coat'][0]); put(a, [(37, 22), (37, 23), (36, 24), (36, 25), (35, 26), (35, 27)], P['coat'][0])   # satin lapels
    put(a, [(32, 23), (33, 23), (35, 23), (36, 23), (32, 24), (33, 24), (35, 24), (36, 24)], P['tie'][2]); put(a, [(34, 23), (34, 24)], P['tie'][3]); put(a, [(32, 23)], P['tie'][0])   # bow tie
    put(a, [(36, 33), (36, 36)], P['gold'][1]); put(a, [(37, 34)], P['gold'][3])                     # buttons
    put(a, [(28, 24), (28, 25)], P['coat'][1]); put(a, [(30, 38), (31, 40)], P['coat'][3])
    put(a, [(29, 33), (30, 33), (31, 33)], P['coat'][3])
    if V.get('card') or VARIANT == 'royal': put(a, [(x, 31) for x in range(28, 33)], P['gold'][2])    # gold trim
    parts['torso'] = a
    # ---------------- the head: slicked black hair at the back and sides, a sly face, curled moustache, goatee
    def face(d, c):
        d.rectangle([32, 17, 34, 21], fill=c)
        d.polygon([(31, 9), (37, 9), (38, 12), (39, 15), (38, 17), (37, 19), (36, 21), (34, 20), (32, 19), (31, 17)], fill=c)
    a = layer(face, 'skin')
    hair = layer(lambda d, c: d.polygon([(30, 9), (36, 9), (35, 10), (33, 11), (32, 15), (30, 15), (29, 12)], fill=c), 'hair')
    a = over(a, hair)
    eye = V.get('eye', EYE)
    put(a, [(36, 12), (37, 12)], P['hair'][2]); put(a, [(38, 11)], P['hair'][2])                       # a sharp arched brow
    put(a, [(36, 13)], 0xffffff); put(a, [(37, 13)], eye[1]); put(a, [(37, 14)], P['skin'][3])           # a violet eye
    put(a, [(39, 15)], P['skin'][3]); put(a, [(38, 15)], P['skin'][1])                                   # nose
    put(a, [(36, 17), (37, 17), (38, 17)], P['hair'][2]); put(a, [(35, 16), (39, 16)], P['hair'][2])     # the curled moustache
    put(a, [(37, 18)], 0x8a3a4a); put(a, [(36, 19), (37, 20), (36, 21)], P['hair'][2])                  # a smirk, the goatee
    put(a, [(32, 13), (32, 14)], P['skin'][3])                                                           # ear
    if V.get('mask'):                                                                                     # THE PHANTOM's white half-mask
        put(a, [(x, y) for x in range(35, 39) for y in range(10, 16) if not (x == 38 and y > 13)], 0xf8f8f4)
        put(a, [(36, 13)], 0x0c2026); put(a, [(37, 13)], eye[1]); put(a, [(35, 15), (36, 15)], 0xc8c8c0)
    parts['head'] = a
    # ---------------- the top hat ('hair' slot): a tall crown, a band, a curled brim (ROYAL FLUSH: a card in the band)
    def hat(d, c):
        d.polygon([(31, 0), (38, 0), (38, 7), (31, 7)], fill=c)
        d.polygon([(28, 8), (41, 8), (41, 10), (28, 10)], fill=c)
    a = layer(hat, 'hat')
    put(a, [(x, 6) for x in range(31, 39)] + [(x, 7) for x in range(31, 39)], P['band'][2]); put(a, [(x, 6) for x in range(32, 37)], P['band'][1])
    put(a, [(32, 1), (32, 2), (32, 3)], P['hat'][0])                                                      # a gleam down the crown
    if V.get('card'): put(a, [(36, 3), (37, 3), (36, 4), (37, 4), (36, 5), (37, 5)], 0xffffff); put(a, [(36, 4)], 0xe02a2a)
    if V.get('ragged'): a[0:2, 35:38] = 0; put(a, [(35, 2), (36, 2), (37, 2)], P['hat'][4]); put(a, [(29, 9)], P['band'][1])   # a dent, a moth hole
    parts['hair'] = a
    # ---------------- the front arm, the wand, the glove
    parts['fupper'] = layer(lambda d, c: limb(d, (38, 24), (42, 31), 4, c), 'coat')
    a = layer(lambda d, c: limb(d, (42, 31), (44, 27), 4, c), 'coat')
    put(a, [(42, 29), (43, 29), (44, 29)], P['lining'][2])
    parts['ffore'] = a
    w = layer(lambda d, c: d.line([(43, 30), (50, 15)], fill=c, width=2), 'wand')
    t1 = layer(lambda d, c: d.line([(49, 17), (50, 15)], fill=c, width=2), 'tip'); t2 = layer(lambda d, c: d.line([(43, 30), (44, 28)], fill=c, width=2), 'tip')
    a = over(over(w, t1), t2)
    put(a, [(50, 14)], 0xffffff)
    parts['mic'] = a
    a = layer(lambda d, c: d.ellipse([42, 23, 46, 28], fill=c), 'glove'); put(a, [(43, 25), (44, 25), (45, 25)], P['glove'][3])
    parts['ffist'] = a
    return parts

# draw order (back to front) and the rig: NU's, plus the cape hung from the shoulders
ORDER = ['cape', 'bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'hair', 'fupper', 'ffore', 'mic', 'ffist']
RIG = {
    'cape': ((31, 22), 'torso'),
    'torso': ((32, 39), None),
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
        VARIANT = v; globals()['VARIANT'] = v
        row.alpha_composite(Image.fromarray(composite(draw_parts())), (i * 64, 0))
    row.resize((64 * 3 * 8, 64 * 8), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'presto_preview.png')
