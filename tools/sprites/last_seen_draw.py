"""LAST SEEN - a TEST FIGHTER out of analog horror: a woman who went missing, and what came back. An original
design, drawn part by part on NU's joints (tools/sprites/nu_draw.py) so the same puppet rig animates it.
Two looks - set_style():

  calm   LAST SEEN: a slight, timid woman in a faded mustard raincoat (belted, buttoned, down to the knee), an
         auburn bob, pale and tired, dark circles, red rain boots; a torn missing poster of herself in one hand.
  wrong  SEEN: what she turns into. Grey wet skin, too-thin limbs ending in long claws, bare feet with long toes,
         black wet hair hanging over the face, white pinprick eyes and a jaw that hangs far too low; the
         raincoat faded and torn to rags.

  python3 tools/sprites/last_seen_draw.py preview.png
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw
from nu_draw import blank, capsule, hx, JOINTS

OUT = 0x0e0a08
STYLE = 'calm'
def set_style(s):
    global STYLE
    STYLE = s

CALM = {
    'coat': (0xe8c86a, 0xc8a240, 0x8a6a22),        # mustard raincoat
    'skin': (0xf4dccc, 0xe0bca8, 0xa88270),        # pale
    'hair': (0xc06a3a, 0x8a4222, 0x5a2410),        # auburn
    'boot': (0xe0504a, 0xb02a26, 0x6a1210),        # red rain boots
    'tight': (0x5a5a62, 0x3e3e46, 0x26262c),       # dark tights
    'paper': (0xffffff, 0xece6d4, 0xb8b09a),
}
WRONG = {
    'coat': (0xa89a5a, 0x7a6e3a, 0x4a4222),        # the coat, faded and filthy
    'skin': (0xb4bcb0, 0x8a9488, 0x5a6258),        # grey, wet
    'hair': (0x2e2a30, 0x141216, 0x060508),        # black, soaked
    'boot': (0xb4bcb0, 0x8a9488, 0x5a6258),        # bare feet
    'tight': (0x8a9488, 0x6a7468, 0x424a40),       # bare legs
    'paper': (0xd8d0b8, 0xb8ae94, 0x7a7262),
}

def finish(img, pal):
    a = nu_draw.finish(img, pal)
    a[np.all(a == np.array(hx(nu_draw.OUT)), -1)] = hx(OUT)
    return a

def put(a, pts, col):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3]: a[y, x] = hx(col)

def draw_parts():
    C = WRONG if STYLE == 'wrong' else CALM
    W = STYLE == 'wrong'
    P = {}
    K, T, B, CO = C['skin'], C['tight'], C['boot'], C['coat']
    # ---------------- legs: thin; boots (calm) or long bare feet with long toes (wrong)
    for side, hip, knee, shin, foot in (('b', 'bhip', 'bknee', [(22, 47), (26, 47), (25, 55), (21, 55)], [(18, 53), (25, 53), (27, 56), (27, 58), (16, 58), (16, 55)]),
                                         ('f', 'fhip', 'fknee', [(38, 47), (42, 47), (43, 55), (39, 55)], [(38, 53), (45, 53), (49, 56), (49, 58), (37, 58), (37, 55)])):
        TH = T if W else CO                                            # her thighs are under the coat
        im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS[hip], JOINTS[knee], 5 if W else 6, hx(TH[1])); P[side + 'thigh'] = finish(im, TH)
        im = blank(); d = ImageDraw.Draw(im); d.polygon(shin if not W else [(x + (1 if i in (0, 3) else -1) * (0 if i < 2 else 0), y) for i, (x, y) in enumerate(shin)], fill=hx((B if not W else T)[1]))
        P[side + 'shin'] = finish(im, B if not W else T)
        im = blank(); d = ImageDraw.Draw(im)
        if W:                                                          # a long grey foot, toes splayed
            x0 = foot[0][0]
            d.polygon([(x0, 54), (x0 + 6, 54), (x0 + 11, 57), (x0 + 11, 58), (x0 - 1, 58)], fill=hx(K[1]))
            a = finish(im, K); put(a, [(x0 + 7, 58), (x0 + 9, 58), (x0 + 11, 58)], 0x2a2e28)
        else:
            d.polygon(foot, fill=hx(B[1])); a = finish(im, B); put(a, [(foot[0][0] + 1, 54), (foot[0][0] + 2, 54)], B[0])
            a[57, foot[4][0]:foot[3][0] + 1][a[57, foot[4][0]:foot[3][0] + 1, 3] > 0] = hx(0x3a1010)
        P[side + 'shoe'] = a
    # ---------------- back arm: a coat sleeve, a hand (calm: clutching her poster)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['bshoulder'], JOINTS['belbow'], 5, hx(CO[1])); P['bupper'] = finish(im, CO)
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['belbow'], (26, 37) if not W else (27, 40), 4, hx(CO[1]))
    if W:
        for (tx, ty) in ((24, 47), (27, 48), (30, 46)): d.line([(27, 41), (tx, ty)], fill=hx(K[1]), width=1)
        d.ellipse([25, 39, 29, 43], fill=hx(K[1]))
    else:
        d.ellipse([24, 36, 28, 40], fill=hx(K[1]))
    a = finish(im, CO)
    if W: put(a, [(24, 47), (27, 48), (30, 46)], 0xe8e8e0)
    P['bfore'] = a
    # the poster in her back hand (calm only): torn paper, a red MISSING band, a little face
    im = blank(); d = ImageDraw.Draw(im)
    if not W:
        d.polygon([(21, 36), (29, 35), (30, 45), (25, 46), (22, 44), (20, 45)], fill=hx(C['paper'][1]))
        a = finish(im, C['paper'])
        put(a, [(x, 37) for x in range(22, 29)], 0xc8281e); put(a, [(x, 38) for x in range(22, 29)], 0xc8281e)
        put(a, [(24, 40), (25, 40), (24, 41), (25, 41), (23, 42), (24, 42), (25, 42), (26, 42)], 0x3a342a)
        put(a, [(22, 44), (23, 44), (26, 44)], 0x8a8478)
    else:
        a = np.array(im)
    P['poster'] = a
    # ---------------- torso: the raincoat, belted, down past the knees (wrong: torn into rags)
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(26, 21), (40, 21), (41, 30), (43, 46), (37, 48), (31, 48), (23, 46), (25, 30)], fill=hx(CO[1]))
    d.polygon([(27, 18), (32, 18), (33, 22), (27, 23)], fill=hx(CO[1]))   # the collar up at the back
    a = finish(im, CO)
    put(a, [(x, 34) for x in range(25, 42)], CO[2]); put(a, [(x, 35) for x in range(25, 42)], CO[2])   # the belt
    put(a, [(33, 34), (34, 34), (33, 35), (34, 35)], 0x6a5a2a if W else 0xd8d0b8)                       # its buckle
    for y in (25, 29, 39, 43): put(a, [(36, y)], 0x3a2e14)                                              # buttons
    put(a, [(35, y) for y in range(23, 47)], CO[2])                                                       # the coat's front edge
    put(a, [(33, 22), (34, 22), (35, 22)], K[1])                                                          # her neck in the collar
    if W:                                                              # torn: ragged hem, holes, stains
        for x in range(23, 44):
            cut = int(3 + 3 * np.sin(x * 1.7) + (x % 3))
            for y in range(48 - cut, 49): a[y, x] = 0
        for (x, y) in [(29, 27), (30, 27), (29, 28), (38, 31), (38, 32), (27, 40), (28, 41)]: put(a, [(x, y)], 0x1a1810)
        for (x, y) in [(31, 30), (32, 31), (31, 37), (39, 39), (26, 33)]: put(a, [(x, y)], 0x4a5a3a)
        ring = (a[..., 3] == 0) & (np.roll(a[..., 3] > 0, 1, 0) | np.roll(a[..., 3] > 0, -1, 1) | np.roll(a[..., 3] > 0, 1, 1))
        ring[:20] = False; a[ring & (np.arange(64)[:, None] > 38)] = hx(OUT)
    P['torso'] = a
    # ---------------- head
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([31, 17, 35, 22], fill=hx(K[1]))                                       # neck
    d.polygon([(29, 8), (38, 8), (39, 12), (40, 15), (39, 17), (38, 20), (35, 21), (31, 21), (29, 18)], fill=hx(K[1]))
    if W: d.polygon([(33, 19), (39, 19), (38, 27), (34, 27)], fill=hx(K[1]))           # the jaw, hanging far too low
    a = finish(im, K)
    if W:
        put(a, [(x, y) for y in range(18, 26) for x in range(35, 38)], 0x050505)        # the open mouth
        put(a, [(35, 18), (37, 18), (36, 26)], 0xd8d8cc)                                # a few teeth
        put(a, [(34, 12), (38, 12)], 0x050505); put(a, [(34, 11), (38, 11)], 0x2a2e28)
        a[12, 34] = hx(0xffffff); a[12, 38] = hx(0xffffff)                             # white pinprick eyes
        put(a, [(33, 13), (33, 14), (37, 14), (37, 15), (38, 16)], 0x4a524a)            # streaks
    else:
        a[12, 34] = hx(0x3a2a2a); a[12, 37] = hx(0x3a2a2a); a[12, 35] = hx(0xffffff); a[12, 38] = hx(0xffffff)   # tired eyes
        put(a, [(34, 13), (35, 13), (37, 13), (38, 13)], 0xc8a090)                      # dark circles
        a[15, 39] = hx(K[2]); a[17, 36:39] = hx(0xa86a6a)                              # nose, a small worried mouth
        a[17, 35] = hx(K[2])
    P['head'] = a
    # ---------------- hair: a neat auburn bob (calm); long black wet strands over the face (wrong)
    im = blank(); d = ImageDraw.Draw(im)
    if W:
        d.polygon([(27, 14), (27, 8), (31, 5), (37, 5), (40, 8), (40, 11), (31, 10), (29, 14)], fill=hx(C['hair'][1]))
        for (x0, x1, y1) in [(28, 25, 30), (29, 27, 33), (30, 30, 28), (31, 31, 24), (33, 33, 17), (40, 42, 21), (40, 41, 26)]:
            d.line([(x0, 8), (x1, y1)], fill=hx(C['hair'][1]), width=2)
    else:
        d.polygon([(28, 17), (27, 9), (30, 6), (37, 6), (40, 8), (41, 12), (38, 10), (33, 10), (31, 12), (30, 18)], fill=hx(C['hair'][1]))
    a = finish(im, C['hair'])
    if W: a[11:28, 34:40] = 0                                          # the face (and that jaw) shows between the strands
    if not W: put(a, [(31, 7), (32, 7), (33, 7)], C['hair'][0])
    P['hair'] = a
    # ---------------- front arm: sleeve and hand (wrong: a long forearm and long claws)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['fshoulder'], JOINTS['felbow'], 5, hx(CO[1])); P['fupper'] = finish(im, CO)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['felbow'], (44, 27), 4, hx(CO[1] if not W else K[1])); P['ffore'] = finish(im, CO if not W else K)
    im = blank(); d = ImageDraw.Draw(im)
    if W:
        d.ellipse([42, 23, 47, 28], fill=hx(K[1]))
        for (tx, ty) in ((52, 16), (54, 20), (53, 25), (49, 14)): d.line([(45, 24), (tx, ty)], fill=hx(K[1]), width=1)
        a = finish(im, K); put(a, [(52, 16), (54, 20), (53, 25), (49, 14)], 0xe8e8e0)
    else:
        d.ellipse([42, 23, 47, 28], fill=hx(K[1])); a = finish(im, K)
    P['ffist'] = a
    return P

ORDER = ['bupper', 'bfore', 'poster', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'hair', 'fupper', 'ffore', 'ffist']
RIG = {**{n: nu_draw.RIG[n] for n in ORDER if n != 'poster'}, 'poster': ((26, 38), 'bfore')}

def composite(P, hide=()):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = P[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    tiles = []
    for s in ('calm', 'wrong'):
        set_style(s); c = composite(draw_parts())
        bg = Image.new('RGBA', (64, 64), (90, 100, 110, 255)); bg.alpha_composite(Image.fromarray(c)); tiles.append(bg)
    sheet = Image.new('RGBA', (128, 64)); sheet.paste(tiles[0], (0, 0)); sheet.paste(tiles[1], (64, 0))
    sheet.resize((768, 384), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'last_seen.png')
