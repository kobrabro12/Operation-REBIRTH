"""THE WANDERER - a lost explorer in the Backrooms (a TEST FIGHTER). His drawing, built part by part on
the same joints as NU (tools/sprites/nu_draw.py) so the puppet rig and NU's pose library animate him.

An original design: a baggy, stained hazmat suit in caution yellow with grey reflective tape on the arms,
a hood cinched round a black rubber gas mask (two round lenses glowing a pale fluorescent green and a
filter canister on the snout), black rubber gloves and boots, an olive backpack with a rolled-up bedroll
on top, and a chunky flashlight in his front hand. Props only out for some moves: a yellow WET FLOOR
sign (ftilt / fsmash) and a bottle of almond water (neutral special), both held in the back hand.

Every part is drawn on its own 64x64 layer (facing right, feet on row 58): flat colour, then a cel shade
(lit from the upper left), then a dark outline round the part. draw_parts() returns {name: RGBA array}.

  python3 tools/sprites/wanderer_draw.py [preview.png]
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import hx, capsule, blank, JOINTS

OUT = 0x16120a
PAL = {
    'suit': (0xf6da5a, 0xdcb52c, 0x94721a),        # caution yellow (skins recolour this group)
    'rub': (0x4c4c54, 0x2e2e34, 0x19191d),         # black rubber: gloves, boots, mask
    'lens': (0xeafff2, 0x9ff0c8, 0x3e9a78),        # fluorescent glow in the mask lenses
    'pack': (0x8a8e52, 0x666a3a, 0x404224),        # olive drab
    'roll': (0x9a6a4a, 0x774e34, 0x4a2e1e),        # the bedroll
    'tape': (0xd8dce0, 0xa8aeb4, 0x6c7278),        # reflective tape / steel
    'lamp': (0x5a5e66, 0x3a3d44, 0x22242a),        # flashlight body
    'sign': (0xffe23a, 0xf0c010, 0xa07a08),
    'bottle': (0xfafaf6, 0xdcdcd4, 0x9a9a92),
}

def finish(img, pal, outline=True):
    """Cel shade a flat part with its 3-tone palette (light top/left, dark bottom/right) and outline it.
    Pixels already painted in other colours (details) are kept."""
    a = np.array(img)
    solid = a[..., 3] > 0
    is_base = solid & np.all(a == np.array(hx(pal[1])), axis=-1)
    H, W = solid.shape
    def sh(m, dy, dx):
        o = np.zeros_like(m)
        o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
        return o
    lit = is_base & (~sh(solid, 1, 0) | ~sh(solid, 0, 1))
    dark = is_base & (~sh(solid, -1, 0) | ~sh(solid, 0, -1) | ~sh(solid, -2, 0) | ~sh(solid, 0, -2))
    a[dark] = hx(pal[2]); a[lit & ~dark] = hx(pal[0])
    if outline:
        ring = ~solid & (sh(solid, 1, 0) | sh(solid, -1, 0) | sh(solid, 0, 1) | sh(solid, 0, -1))
        a[ring] = hx(OUT)
    return a

def put(a, pts, col):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3]: a[y, x] = hx(col)

def draw_parts():
    P = {}
    S = PAL['suit']; RB = PAL['rub']
    # ---------------- backpack (behind everything): olive pack, bedroll strapped on top
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([18, 23, 26, 38], fill=hx(PAL['pack'][1]))
    d.rectangle([17, 27, 18, 36], fill=hx(PAL['pack'][1]))              # side pocket
    a = finish(im, PAL['pack'])
    a[30, 19:26] = hx(PAL['pack'][2]); a[31, 19:26] = hx(PAL['pack'][0])  # flap seam
    a[32, 22] = hx(PAL['tape'][1])                                        # buckle
    im2 = blank(); d2 = ImageDraw.Draw(im2)
    d2.ellipse([16, 18, 27, 24], fill=hx(PAL['roll'][1]))
    r = finish(im2, PAL['roll'])
    r[21, 18:26] = hx(PAL['roll'][2]); r[19:24, 21] = hx(OUT)             # roll seam and strap
    m = r[..., 3] > 0; a[m] = r[m]
    P['pack'] = a
    # ---------------- back leg: baggy suit thigh, shin, black boot
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['bhip'], JOINTS['bknee'], 10, hx(S[1]))
    P['bthigh'] = finish(im, S)
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(20, 47), (29, 47), (28, 54), (19, 54)], fill=hx(S[1]))
    a = finish(im, S); a[51, 20:28] = hx(S[2])                            # a crease where it bunches over the boot
    P['bshin'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(17, 52), (26, 52), (28, 55), (28, 58), (15, 58), (15, 55)], fill=hx(RB[1]))
    a = finish(im, RB); a[57, 15:29] = hx(0x0e0e10); a[54, 18:25] = hx(RB[0])
    P['bshoe'] = a
    # ---------------- front leg
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['fhip'], JOINTS['fknee'], 10, hx(S[1]))
    a = finish(im, S); put(a, [(40, 43), (41, 44)], S[2])                # a stain
    P['fthigh'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(37, 47), (46, 47), (47, 54), (38, 54)], fill=hx(S[1]))
    a = finish(im, S); a[51, 39:46] = hx(S[2])
    P['fshin'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(37, 52), (46, 52), (50, 55), (50, 58), (36, 58), (36, 55)], fill=hx(RB[1]))
    a = finish(im, RB); a[57, 36:51] = hx(0x0e0e10); a[54, 39:47] = hx(RB[0])
    P['fshoe'] = a
    # ---------------- back arm: suit sleeve with tape, black glove
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['bshoulder'], JOINTS['belbow'], 7, hx(S[1]))
    a = finish(im, S); put(a, [(25, 27), (26, 27), (27, 27), (28, 27)], PAL['tape'][0])
    P['bupper'] = a
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['belbow'], (27, 35), 6, hx(S[1]))
    a = finish(im, S)
    im2 = blank(); d2 = ImageDraw.Draw(im2); d2.ellipse([24, 35, 30, 40], fill=hx(RB[1])); g = finish(im2, RB)
    m = g[..., 3] > 0; a[m] = g[m]
    P['bfore'] = a
    # ---------------- props in the back fist (hidden unless a move shows them)
    im = blank(); d = ImageDraw.Draw(im)                                  # WET FLOOR sign, held by its top handle
    d.polygon([(25, 39), (30, 39), (34, 54), (21, 54)], fill=hx(PAL['sign'][1]))
    a = finish(im, PAL['sign'])
    a[40, 26:30] = hx(OUT)                                                # the handle slot
    for (x, y) in [(27, 43), (28, 43), (27, 44), (28, 44), (26, 46), (27, 46), (28, 46), (29, 46), (27, 47), (27, 48), (26, 49), (28, 49), (25, 50), (29, 50)]:
        a[y, x] = hx(OUT)                                                 # the slipping-man warning symbol
    a[52, 23:33] = hx(OUT)                                                # 'WET FLOOR' lettering as a dark band
    P['sign'] = a
    im = blank(); d = ImageDraw.Draw(im)                                  # a bottle of almond water
    d.rectangle([25, 31, 29, 40], fill=hx(PAL['bottle'][1]))
    a = finish(im, PAL['bottle'])
    a[30, 26:29] = hx(0x3a7ad0); a[29, 26:29] = hx(0x5a9af0)              # blue cap
    a[35, 25:30] = hx(0xc8a878); a[36, 25:30] = hx(0xc8a878)              # paper label
    P['bottle'] = a
    # ---------------- torso: baggy suit, zip, tape band, chest patch
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(24, 21), (41, 21), (43, 30), (42, 42), (24, 42), (23, 30)], fill=hx(S[1]))
    a = finish(im, S)
    for y in range(23, 41): a[y, 35] = hx(S[2])                            # zip
    a[23, 35] = hx(PAL['tape'][0]); a[24, 35] = hx(PAL['tape'][1])
    a[34, 24:43] = hx(PAL['tape'][1]); a[33, 25:42] = hx(PAL['tape'][0])   # reflective band at the waist
    a[26:29, 37:41] = hx(PAL['tape'][1]); a[26, 37:41] = hx(PAL['tape'][0])  # name patch
    a[27, 38] = hx(OUT); a[27, 40] = hx(OUT)
    put(a, [(28, 38), (29, 38), (29, 39), (26, 30), (30, 25)], S[2])       # grime
    a[41, 24:43] = hx(RB[1])                                              # belt
    a[41, 30] = hx(PAL['tape'][0])
    P['torso'] = a
    # ---------------- head: yellow hood cinched round a black gas mask
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([27, 6, 41, 22], fill=hx(S[1]))                             # the hood
    a = finish(im, S)
    im2 = blank(); d2 = ImageDraw.Draw(im2)
    d2.polygon([(31, 10), (39, 9), (41, 12), (41, 19), (38, 21), (32, 21), (30, 17)], fill=hx(RB[1]))   # the mask
    d2.rectangle([39, 15, 43, 19], fill=hx(RB[1]))                       # filter canister
    g = finish(im2, RB)
    g[16:19, 43] = hx(RB[0]); g[17, 41:44] = hx(RB[2])                   # canister ridges
    for (cx, cy) in ((34, 13), (38, 13)):                                 # the two round lenses
        for (x, y) in [(cx - 1, cy), (cx, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1), (cx - 1, cy + 1), (cx + 1, cy - 1)]:
            g[y, x] = hx(PAL['lens'][1])
        g[cy - 1, cx - 1] = hx(PAL['lens'][0]); g[cy + 1, cx + 1] = hx(PAL['lens'][2])
        g[cy - 2, cx - 1:cx + 2] = hx(PAL['tape'][2])                     # lens rims
    m = g[..., 3] > 0; a[m] = g[m]
    a[21, 30:39] = hx(S[2]); a[20, 29] = hx(S[2])                          # hood drawstring hem
    a[20, 40] = hx(PAL['tape'][0]); a[21, 40] = hx(PAL['tape'][0])        # cord toggles
    P['head'] = a
    # ---------------- front arm: sleeve with tape, then the flashlight and the glove holding it
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['fshoulder'], JOINTS['felbow'], 7, hx(S[1]))
    a = finish(im, S); put(a, [(38, 27), (39, 27), (40, 28), (41, 28)], PAL['tape'][0])
    P['fupper'] = a
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['felbow'], (44, 27), 6, hx(S[1]))
    P['ffore'] = finish(im, S)
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([43, 24, 52, 27], fill=hx(PAL['lamp'][1]))               # barrel
    d.rectangle([52, 22, 55, 29], fill=hx(PAL['lamp'][1]))               # head
    a = finish(im, PAL['lamp'])
    a[23:29, 55] = hx(0xfff6c8); a[24:28, 55] = hx(0xffffff); a[23:29, 54] = hx(PAL['lamp'][2])   # the lens
    a[22, 52:55] = hx(PAL['tape'][0]); a[25, 49] = hx(0xd84a3a)           # chrome rim, red switch
    P['lamp'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([41, 23, 47, 29], fill=hx(RB[1]))
    a = finish(im, RB); a[24, 43] = hx(RB[0]); a[26, 42:46] = hx(RB[2])
    P['ffist'] = a
    return P

# draw order (back to front) and the rig: name -> (pivot, parent)
ORDER = ['pack', 'bupper', 'bfore', 'sign', 'bottle', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'fupper', 'ffore', 'lamp', 'ffist']
RIG = {
    'torso': ((32, 39), None),
    'pack': ((26, 26), 'torso'),
    'head': ((33, 21), 'torso'),
    'bupper': ((27, 24), 'torso'), 'bfore': ((25, 31), 'bupper'), 'sign': ((27, 38), 'bfore'), 'bottle': ((27, 38), 'bfore'),
    'fupper': ((38, 24), 'torso'), 'ffore': ((42, 31), 'fupper'), 'lamp': ((44, 26), 'ffore'), 'ffist': ((44, 26), 'ffore'),
    'bthigh': ((28, 40), None), 'bshin': ((26, 48), 'bthigh'), 'bshoe': ((24, 55), 'bshin'),
    'fthigh': ((36, 40), None), 'fshin': ((39, 48), 'fthigh'), 'fshoe': ((40, 55), 'fshin'),
}
PROPS = ('sign', 'bottle')

def composite(P, hide=PROPS):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = P[n]; m = a[..., 3] > 0
        out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (60, 56, 40, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'wanderer_preview.png')
