"""DEAD AIR - a TEST FIGHTER out of analog horror and found-footage ARGs: the thing that lives in the gap
between broadcasts. An original design.

Too tall and too thin, in a 1980s grey presenter's suit with a burgundy tie and a station pin, long chalk-white
hands with too many knuckles. Slicked black hair, a face like a photograph that's slightly wrong: chalk skin,
two empty black eyes, and a smile far too wide, with little teeth. The game adds the rest live: VHS colour
bleed, tracking lines, static.

Drawn part by part on NU's joints (tools/sprites/nu_draw.py) so the same puppet rig animates it.

  python3 tools/sprites/dead_air_draw.py preview.png
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw
from nu_draw import blank, capsule, hx, JOINTS

OUT = 0x0a0a0e
PAL = {
    'suit': (0x8a8a90, 0x66666e, 0x3e3e46),
    'suitdark': (0x5a5a62, 0x44444c, 0x26262c),
    'skin': (0xf4f2ec, 0xdcd8d0, 0xa8a49c),       # chalk white
    'hair': (0x3a3640, 0x1e1c22, 0x0e0c10),
    'tie': (0xa83a48, 0x7a1e2c, 0x46101a),
    'shoe': (0x3a3a40, 0x1e1e24, 0x0e0e12),
    'shirt': (0xffffff, 0xe8e6e0, 0xb0aea8),
}

def finish(img, pal):
    a = nu_draw.finish(img, pal)
    a[np.all(a == np.array(hx(nu_draw.OUT)), -1)] = hx(OUT)
    return a

def put(a, pts, col):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3]: a[y, x] = hx(col)

def draw_parts():
    P = {}
    S, SD, K = PAL['suit'], PAL['suitdark'], PAL['skin']
    # ---------------- legs: thin, too long at the shin; trouser creases; pointed black shoes
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['bhip'], JOINTS['bknee'], 6, hx(SD[1])); P['bthigh'] = finish(im, SD)
    im = blank(); d = ImageDraw.Draw(im); d.polygon([(22, 47), (27, 47), (26, 55), (21, 55)], fill=hx(SD[1])); P['bshin'] = finish(im, SD)
    im = blank(); d = ImageDraw.Draw(im); d.polygon([(19, 54), (25, 54), (28, 57), (28, 58), (17, 58), (17, 56)], fill=hx(PAL['shoe'][1]))
    a = finish(im, PAL['shoe']); put(a, [(21, 55), (22, 55)], 0x5a5a62); P['bshoe'] = a
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['fhip'], JOINTS['fknee'], 6, hx(S[1])); a = finish(im, S); put(a, [(39, y) for y in range(42, 48)], S[2]); P['fthigh'] = a
    im = blank(); d = ImageDraw.Draw(im); d.polygon([(38, 47), (43, 47), (44, 55), (39, 55)], fill=hx(S[1])); a = finish(im, S); put(a, [(41, y) for y in range(48, 55)], S[2]); P['fshin'] = a
    im = blank(); d = ImageDraw.Draw(im); d.polygon([(39, 54), (45, 54), (50, 57), (50, 58), (38, 58), (38, 56)], fill=hx(PAL['shoe'][1]))
    a = finish(im, PAL['shoe']); put(a, [(42, 55), (43, 55), (44, 55)], 0x5a5a62); P['fshoe'] = a
    # ---------------- back arm: a thin sleeve, a long white hand with spindly fingers
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['bshoulder'], JOINTS['belbow'], 5, hx(SD[1])); P['bupper'] = finish(im, SD)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['belbow'], (26, 36), 4, hx(SD[1]))
    d.rectangle([24, 36, 28, 37], fill=hx(PAL['shirt'][1]))                          # cuff
    for (tx, ty) in ((24, 43), (26, 44), (28, 43)): d.line([(26, 38), (tx, ty)], fill=hx(K[1]), width=1)
    d.ellipse([24, 37, 28, 40], fill=hx(K[1]))
    a = finish(im, SD); P['bfore'] = a
    # ---------------- torso: a narrow suit jacket, white shirt, burgundy tie, a station pin on the lapel
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(26, 21), (40, 21), (41, 30), (40, 41), (26, 41), (25, 30)], fill=hx(S[1]))
    a = finish(im, S)
    for y in range(22, 33):                                                          # shirt V and tie
        w = max(1, 3 - (y - 22) // 3)
        put(a, [(x, y) for x in range(34 - w, 35 + w)], PAL['shirt'][1])
    put(a, [(34, 22), (34, 23)], PAL['tie'][0])
    for y in range(24, 36): put(a, [(34, y), (35, y) if y > 26 else (34, y)], PAL['tie'][1] if y % 4 else PAL['tie'][2])
    for y in range(22, 34): put(a, [(32 - (y - 22) // 4, y)], S[2]); put(a, [(37 + (y - 22) // 5, y)], S[0])   # lapels
    put(a, [(29, 26), (30, 26), (29, 27)], 0xd8221e); put(a, [(30, 27)], 0xffffff)   # the station pin: a red dot
    put(a, [(36, 36), (36, 39)], 0x26262c)                                           # buttons
    put(a, [(28, 33), (29, 33), (30, 33)], S[2])                                     # pocket
    put(a, [(28, 32), (29, 32)], 0xffffff)                                           # a folded paper in it
    P['torso'] = a
    # ---------------- head: a long neck, chalk face, black eyes, the smile
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([31, 17, 35, 22], fill=hx(K[1]))                                     # neck
    d.polygon([(29, 7), (38, 7), (40, 11), (40, 16), (39, 19), (35, 21), (31, 21), (29, 18)], fill=hx(K[1]))
    a = finish(im, K)
    for (x, y) in [(33, 11), (34, 11), (33, 12), (34, 12), (37, 11), (38, 11), (37, 12), (38, 12), (33, 13), (38, 13)]: a[y, x] = hx(0x050507)   # empty eyes
    a[11, 34] = hx(0x1a1a20)
    for x in range(32, 41): a[16, x] = hx(0x050507)                                  # the smile, ear to ear
    a[15, 31] = hx(0x050507); a[15, 40] = hx(0x050507)
    for x in range(33, 40, 2): a[17, x] = hx(0xf4f2ec)                               # little teeth
    for x in range(33, 40): a[17, x] = a[17, x] if x % 2 else hx(0x050507)
    a[18, 34:39] = hx(K[2])
    a[13, 30] = hx(K[2]); a[14, 29] = hx(K[1])                                       # ear
    P['head'] = a
    # ---------------- hair: slicked flat and black, a hard parting
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(28, 11), (28, 7), (31, 4), (37, 4), (40, 6), (41, 9), (36, 8), (31, 8), (30, 12)], fill=hx(PAL['hair'][1]))
    a = finish(im, PAL['hair']); put(a, [(33, 5), (34, 5), (35, 5)], PAL['hair'][0]); put(a, [(32, 6), (32, 7)], 0x5a5660)
    P['hair'] = a
    # ---------------- front arm: sleeve, a long white hand with long fingers
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['fshoulder'], JOINTS['felbow'], 5, hx(S[1])); P['fupper'] = finish(im, S)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['felbow'], (44, 27), 4, hx(S[1])); d.rectangle([43, 26, 46, 28], fill=hx(PAL['shirt'][1]))
    P['ffore'] = finish(im, S)
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([42, 23, 47, 28], fill=hx(K[1]))
    for (tx, ty) in ((50, 18), (51, 20), (51, 23), (49, 16)): d.line([(45, 24), (tx, ty)], fill=hx(K[1]), width=1)   # long fingers, splayed
    a = finish(im, K); put(a, [(50, 18), (51, 20), (51, 23), (49, 16)], 0xb0aca4)
    P['ffist'] = a
    return P

ORDER = ['bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'hair', 'fupper', 'ffore', 'ffist']
RIG = {n: nu_draw.RIG[n] for n in ORDER}

def composite(P, hide=()):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = P[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (90, 100, 110, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'dead_air.png')
