"""FULL AERO - AERO's transformed look (his alternate Limit with two computers out).

Still him - the glass fishbowl, the goldfish in charge, the glossy white suit and aqua - but angelic and
regal: a golden halo floating over the bowl, the goldfish wearing a tiny crown, a pair of white feathered
wings with aqua tips behind him, a royal aqua cape with gold trim and a white collar in place of the leaf
scarf, gold trim on the suit (belt, collar, boot soles) and golden gloves.

He also carries a GOLDEN SPEAR in his front hand, along the line of his forearm, so it points wherever he
swings (part 'spear', hung on the glove).

Built on aero_draw.py's parts (same joints and rig), with three new parts: 'wings', 'halo' and 'spear'.
The cape keeps the scarf's part name, so it trails and streams the same way.
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw
import aero_draw
from aero_draw import finish, shine, OUT, JOINTS
from nu_draw import blank, hx

GOLD = (0xfff2a8, 0xf3c358, 0xb07a1e)
ROYAL = (0x9ff0ff, 0x2a9fd0, 0x135a8a)
FEATHER = (0xffffff, 0xeef8ff, 0xb8d8ea)
PAL = dict(aero_draw.PAL, gold=GOLD, royal=ROYAL, feather=FEATHER)

def recolor(a, src, dst):
    for s, d in zip(src, dst):
        m = np.all(a[..., :3] == np.array(hx(s)[:3]), -1) & (a[..., 3] > 0)
        a[m] = hx(d)
    return a

def draw_parts():
    P = aero_draw.draw_parts()
    A, L, W = aero_draw.PAL['aqua'], aero_draw.PAL['lime'], aero_draw.PAL['white']
    yy, xx = np.mgrid[0:64, 0:64]
    # ---- gold trim: the belt and the boot soles' green stripe turn gold; gloves go gold
    P['torso'] = recolor(P['torso'], L, GOLD)
    for k in ('bshoe', 'fshoe'): P[k] = recolor(P[k], L, GOLD)
    P['ffist'] = recolor(P['ffist'], A, GOLD)
    b = P['bfore']; P['bfore'] = recolor(b, (A[0], A[1]), (GOLD[0], GOLD[1]))
    t = P['torso']                                                         # a gold collar line and a gold chest star
    for x in range(28, 39):
        if t[22, x, 3] and not np.all(t[22, x] == np.array(hx(OUT))): t[22, x] = hx(GOLD[1])
    for (x, y) in [(33, 25), (33, 31), (30, 28), (36, 28)]: t[y, x] = hx(GOLD[0])
    # ---- the royal cape (in the scarf's place): white collar, aqua velvet, gold hem, hanging down his back
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(31, 21), (26, 21), (21, 25), (17, 33), (15, 42), (18, 47), (24, 44), (27, 38), (29, 30), (31, 25)], fill=hx(ROYAL[1]))
    a = finish(im, ROYAL)
    inside = (a[..., 3] > 0) & ~np.all(a == np.array(hx(OUT)), -1)
    a[inside & (yy <= 23)] = hx(0xffffff)                                   # fur collar
    a[inside & (yy == 24)] = hx(FEATHER[2])
    hem = inside & ((yy >= 44) | ((yy >= 41) & (xx <= 18)))
    a[hem] = hx(GOLD[1])                                                   # gold hem
    for y in range(26, 42):
        x = int(round(26 - (y - 26) * 0.45))
        if a[y, x, 3] and inside[y, x]: a[y, x] = hx(ROYAL[0])              # a velvet sheen
    shine(a, [(24, 27), (23, 28)])
    P['scarf'] = a
    # ---- wings: two layered feathered wings sweeping up and back behind his shoulders
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(30, 25), (24, 20), (17, 12), (11, 6), (7, 6), (8, 11), (5, 13), (7, 18), (4, 21), (8, 25), (6, 29), (12, 30), (18, 31), (25, 30)], fill=hx(FEATHER[1]))
    a = finish(im, FEATHER)
    inside = (a[..., 3] > 0) & ~np.all(a == np.array(hx(OUT)), -1)
    for (x0, y0, x1, y1) in [(28, 26, 9, 10), (28, 27, 7, 19), (27, 28, 8, 26)]:            # feather lines
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n):
            x = int(round(x0 + (x1 - x0) * i / n)); y = int(round(y0 + (y1 - y0) * i / n))
            if inside[y, x]: a[y, x] = hx(FEATHER[2])
    tips = inside & (xx <= 10)
    a[tips] = hx(aero_draw.PAL['aqua'][0])                                  # aqua feather tips
    a[tips & (yy % 4 == 0)] = hx(aero_draw.PAL['aqua'][1])
    shine(a, [(14, 12), (15, 13), (16, 14), (12, 22), (13, 22)])
    P['wings'] = a
    # ---- the halo: a thin golden ring floating just above the bowl
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([26, 0, 40, 4], outline=hx(GOLD[1]), width=1)
    a = np.array(im)
    a[0, 30:36] = hx(GOLD[0]); a[4, 29:37] = hx(GOLD[2])
    P['halo'] = a
    # ---- the goldfish wears a tiny crown
    f = P['fish']
    for (x, y, c) in [(33, 11, 1), (34, 10, 0), (35, 11, 1), (36, 10, 0), (37, 11, 1), (33, 12, 2), (34, 12, 1), (35, 12, 1), (36, 12, 1), (37, 12, 2)]:
        f[y, x] = hx(GOLD[c])
    P['fish'] = f
    # ---- the golden spear: through his glove along the forearm (elbow 42,31 -> glove 44,26), the point well
    # past his hand, the butt behind it. A leaf-shaped gold head with a white edge and an aqua tassel.
    import math
    gx, gy = 44, 26
    ux, uy = 2 / math.hypot(2, 5), -5 / math.hypot(2, 5)                  # along the forearm, outward
    tip = (gx + ux * 25.5, gy + uy * 25.5); butt = (gx - ux * 17, gy - uy * 17); neck = (gx + ux * 16, gy + uy * 16)
    im = blank(); d = ImageDraw.Draw(im)
    d.line([butt, neck], fill=hx(GOLD[0]), width=2)                        # the shaft
    px, py = -uy, ux                                                       # sideways
    d.polygon([neck, (neck[0] + ux * 3 + px * 4, neck[1] + uy * 3 + py * 4), tip, (neck[0] + ux * 3 - px * 4, neck[1] + uy * 3 - py * 4)], fill=hx(GOLD[0]))
    a = finish(im, GOLD)
    for i in range(3, 8):                                                  # a white gleam up the blade
        x, y = int(round(neck[0] + ux * i + px)), int(round(neck[1] + uy * i + py))
        if 0 <= x < 64 and 0 <= y < 64 and a[y, x, 3]: a[y, x] = hx(0xffffff)
    for i in range(2):                                                     # the aqua tassel under the head
        x, y = int(round(neck[0] - ux * (1 + i) - px * 2)), int(round(neck[1] - uy * (1 + i) - py * 2))
        a[y, x] = hx(aero_draw.PAL['aqua'][0 if i else 1])
    bx, by = int(round(butt[0])), int(round(butt[1]))
    a[by, bx] = hx(GOLD[2])                                                # the butt cap
    P['spear'] = a
    return P

ORDER = ['wings', 'scarf', 'bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'halo', 'fish', 'fupper', 'ffore', 'spear', 'ffist']
RIG = dict(aero_draw.RIG, wings=((29, 25), 'torso'), halo=((33, 2), 'head'), spear=((44, 26), 'ffist'))

def composite(P, hide=()):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = P[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (120, 160, 220, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((512, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'aero_king_preview.png')
