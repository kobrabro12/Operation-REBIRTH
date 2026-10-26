"""LAST SEEN - a TEST FIGHTER out of analog horror: a woman who went missing, and what came back. An original
design, drawn part by part on NU's joints (tools/sprites/nu_draw.py) so the same puppet rig animates it.

Drawn to sit next to Mason's Soul Summoner and Mr Wake: slim, tall proportions and a small head, no heavy black
outline - each piece is outlined in a darker shade of its own colour - and five-tone shading with highlights,
creases and hair strands. Two looks - set_style():

  calm   LAST SEEN: a slight, timid woman in a faded mustard raincoat (belted, buttoned, down past the knee), an
         auburn bob, pale and tired, dark circles, red rain boots; a torn missing poster of herself in one hand.
  wrong  SEEN: what she turns into - an old restaurant mascot animatronic, a canary, scrapped and rotting, with her
         inside it. Faded yellow fur torn away in patches over a rusted metal endoskeleton, wires hanging out, one
         plastic eye, the beak hanging open - and through the gaps, her: her eye in the beak, her auburn hair at the
         neck, her mustard raincoat through the hole in its chest. (draw_mascot())

  python3 tools/sprites/last_seen_draw.py preview.png
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw
from nu_draw import blank, hx

STYLE = 'calm'
def set_style(s):
    global STYLE
    STYLE = s

# five tones per material: highlight, light, mid, shadow, outline
CALM = {
    'coat': (0xf2dc8a, 0xd8b452, 0xb8923a, 0x86642a, 0x4a3218),
    'skin': (0xfbe9dc, 0xf0d0bc, 0xd9ae98, 0xa87c6c, 0x5a3a34),
    'hair': (0xd88a52, 0xb0603a, 0x8a4426, 0x5e2a16, 0x2e140a),
    'boot': (0xf07a6a, 0xc8443a, 0xa02c26, 0x6a1814, 0x360a08),
    'tight': (0x6a6874, 0x4e4c58, 0x3a3842, 0x26242c, 0x141218),
    'paper': (0xffffff, 0xf4efe0, 0xe2dac4, 0xb8b09a, 0x6a6458),
}
WRONG = {
    'coat': (0xb4a868, 0x958a52, 0x766c3e, 0x524a2a, 0x2a2414),
    'skin': (0xcad2c4, 0xa8b0a2, 0x8a9284, 0x626a5e, 0x2e342c),
    'hair': (0x4a4450, 0x2e2a32, 0x1c1a20, 0x100e12, 0x060508),
    'boot': (0xcad2c4, 0xa8b0a2, 0x8a9284, 0x626a5e, 0x2e342c),
    'tight': (0xb4bcae, 0x96a090, 0x7a8474, 0x58604e, 0x2a3026),
    'paper': (0xd8d0b8, 0xc4bca2, 0xa89e84, 0x7a7262, 0x3a3428),
}

def shade(img, pal):
    """Light from the upper left: a highlight edge, the mid tone, a two-pixel shadow on the lower right, and an
    outline in the material's own darkest shade (not black)."""
    a = np.array(img)
    solid = a[..., 3] > 0
    base = np.all(a[..., :3] == np.array(hx(pal[2])[:3]), -1) & solid
    H, W = solid.shape
    def sh(m, dy, dx):
        o = np.zeros_like(m)
        o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
        return o
    edge_ul = ~sh(solid, 1, 0) | ~sh(solid, 0, 1)
    edge_ul2 = ~sh(solid, 2, 0) | ~sh(solid, 0, 2)
    edge_dr = ~sh(solid, -1, 0) | ~sh(solid, 0, -1)
    edge_dr2 = ~sh(solid, -2, 0) | ~sh(solid, 0, -2)
    a[base & edge_dr2] = hx(pal[3])
    a[base & edge_ul2 & ~edge_dr2] = hx(pal[1])
    a[base & edge_ul & ~edge_dr] = hx(pal[0])
    ring = ~solid & (sh(solid, 1, 0) | sh(solid, -1, 0) | sh(solid, 0, 1) | sh(solid, 0, -1))
    a[ring] = hx(pal[4])
    return a

def put(a, pts, col):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3]: a[y, x] = hx(col)

def limb(d, a, b, w, col):
    d.line([a, b], fill=col, width=w)
    r = w / 2 - 0.5
    for (x, y) in (a, b): d.ellipse([x - r, y - r, x + r, y + r], fill=col)

FUR = (0xf0e09a, 0xd8c070, 0xb89e4e, 0x86703a, 0x4a3c1e)          # faded yellow fur
FURD = (0xc8b478, 0xa89458, 0x86743e, 0x5e5028, 0x30280e)         # the far side, dirtier
METAL = (0xc8ccd0, 0xa0a4aa, 0x7a7e86, 0x52565e, 0x24262c)        # the endoskeleton
BEAK = (0xf0a868, 0xd8844a, 0xb06636, 0x7a4422, 0x3e200e)         # orange plastic, faded
RUST = (0x8a4a22, 0x6a3418)
WIRES = (0xc8281e, 0x2a5ad8, 0xffd23a)

def rod(d, a, b, col, w=2):
    d.line([a, b], fill=col, width=w)

def draw_mascot():
    """SEEN: the scrapped canary animatronic, with her inside it."""
    P = {}
    rng = np.random.RandomState(5)
    def grime(a, n=6):                                                 # rust and stains scattered over a part
        ys, xs = np.nonzero(a[..., 3] > 0)
        for i in rng.choice(len(xs), min(n, len(xs)), replace=False):
            if tuple(a[ys[i], xs[i], :3]) not in (tuple(hx(FUR[4])[:3]), tuple(hx(METAL[4])[:3])): a[ys[i], xs[i]] = hx(RUST[i % 2])
    # ---------------- legs: back leg stripped to the metal, front leg still furred
    im = blank(); d = ImageDraw.Draw(im); limb(d, (28, 40), (25, 48), 6, hx(FURD[2])); a = shade(im, FURD); grime(a, 3); P['bthigh'] = a
    im = blank(); d = ImageDraw.Draw(im); rod(d, (25, 48), (24, 55), hx(METAL[2]), 2); d.ellipse([23, 46, 27, 50], fill=hx(METAL[2]))
    d.rectangle([24, 50, 26, 52], fill=hx(METAL[3])); a = shade(im, METAL); put(a, [(25, 51)], RUST[0]); P['bshin'] = a
    im = blank(); d = ImageDraw.Draw(im)
    for (tx, ty) in ((19, 58), (23, 58), (27, 58)): d.line([(24, 55), (tx, ty)], fill=hx(METAL[2]), width=2)
    a = shade(im, METAL); P['bshoe'] = a
    im = blank(); d = ImageDraw.Draw(im); limb(d, (37, 40), (40, 48), 7, hx(FUR[2])); a = shade(im, FUR)
    put(a, [(39, 45), (40, 46), (41, 46), (40, 47)], 0x1a1a1a); put(a, [(40, 46)], METAL[1]); grime(a, 3); P['fthigh'] = a   # a tear at the knee: metal underneath
    im = blank(); d = ImageDraw.Draw(im); limb(d, (40, 48), (40, 54), 6, hx(FUR[2])); a = shade(im, FUR)
    for y in (53, 54): put(a, [(39, y), (40, y), (41, y)], METAL[2])                                                       # torn away at the ankle
    P['fshin'] = a
    im = blank(); d = ImageDraw.Draw(im)
    for (tx, ty) in ((44, 58), (47, 57), (36, 58)): limb(d, (40, 55), (tx, ty), 3, hx(BEAK[2]))                             # big three-toed bird foot
    a = shade(im, BEAK); grime(a, 2); P['fshoe'] = a
    # ---------------- back arm: the fur hanging off it, the forearm bare metal with a claw hand
    im = blank(); d = ImageDraw.Draw(im); limb(d, (27, 24), (25, 31), 6, hx(FURD[2])); a = shade(im, FURD); grime(a, 2); P['bupper'] = a
    im = blank(); d = ImageDraw.Draw(im); rod(d, (25, 31), (26, 38), hx(METAL[2]), 2); d.ellipse([23, 29, 27, 33], fill=hx(METAL[3]))
    for (tx, ty) in ((23, 43), (26, 44), (29, 42)): d.line([(26, 38), (tx, ty)], fill=hx(METAL[2]), width=1)
    a = shade(im, METAL); put(a, [(27, 34), (27, 35)], WIRES[0]); put(a, [(28, 36)], WIRES[1]); P['bfore'] = a
    P['poster'] = np.array(blank())
    # ---------------- body: a round furred belly, a bow tie, stitched seams - and a hole torn in the chest: her inside
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([25, 20, 41, 44], fill=hx(FUR[2]))
    d.rectangle([28, 40, 38, 45], fill=hx(FUR[2]))
    a = shade(im, FUR)
    for (x, y) in [(29, 23), (30, 22), (31, 23), (32, 22), (33, 23)]: put(a, [(x, y)], 0xc8281e)                          # a faded bow tie
    put(a, [(31, 22), (31, 23)], 0x8a1a14)
    hole = [(x, y) for y in range(27, 35) for x in range(30, 37) if (x - 33) ** 2 / 9 + (y - 31) ** 2 / 14 <= 1]
    put(a, hole, 0x0a0806)                                                                                                   # the hole...
    put(a, [(31, 30), (32, 30), (31, 31), (32, 31), (32, 32), (33, 32), (33, 33)], 0xb8923a)                               # ...her raincoat inside it
    put(a, [(34, 29), (35, 30), (35, 31)], 0xd9ae98)                                                                        # ...and her pale hand, pressed to the gap
    put(a, [(36, 32), (36, 33), (37, 34)], WIRES[0]); put(a, [(30, 34), (29, 35)], WIRES[1])                               # wires spilling out
    for (x, y0, c) in [(31, 44, WIRES[0]), (35, 44, WIRES[2]), (37, 43, 0x1a1a1a)]:                                        # more dangling from under it
        for y in range(y0, y0 + 4): a[y, x] = hx(c)
    for (x, y) in [(29, 27), (30, 26), (37, 28), (36, 35), (30, 36)]: put(a, [(x, y)], FUR[4])                             # torn edges
    for y in range(36, 44, 2): put(a, [(33, y)], FUR[3])                                                                    # a stitched seam
    grime(a, 8)
    P['torso'] = a
    # ---------------- head: a big round canary head, one plastic eye, the beak hanging open - her eye inside
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([31, 16, 35, 22], fill=hx(METAL[2]))                                                                        # the neck: bare metal
    d.ellipse([27, 3, 42, 19], fill=hx(FUR[2]))
    a = shade(im, FUR)
    im2 = blank(); d2 = ImageDraw.Draw(im2)
    d2.polygon([(40, 9), (47, 11), (40, 13)], fill=hx(BEAK[2]))                                                             # upper beak
    d2.polygon([(39, 15), (45, 19), (39, 18)], fill=hx(BEAK[2]))                                                            # lower beak, hanging open
    bk = shade(im2, BEAK); m = bk[..., 3] > 0; a[m] = bk[m]
    put(a, [(40, 13), (41, 13), (40, 14), (41, 14), (42, 14), (40, 15)], 0x0a0806)                                          # the gap...
    put(a, [(41, 14)], 0xf4f2ec); put(a, [(40, 14)], 0x3a2a2a)                                                               # ...and her eye in it, looking out
    for (x, y) in [(x, y) for y in range(6, 11) for x in range(35, 40) if (x - 37) ** 2 + (y - 8) ** 2 <= 5]: put(a, [(x, y)], 0xf0f0e8)   # its big plastic eye
    put(a, [(35, 6), (39, 6), (35, 10), (39, 10)], FUR[3])
    put(a, [(38, 9), (38, 8)], 0x101010); put(a, [(36, 7)], 0xffffff); put(a, [(35, 9), (34, 10), (34, 11)], 0x6a6458)    # pupil, drooping; a crack
    for (x, y) in [(29, 12), (30, 13), (30, 14), (31, 13)]: put(a, [(x, y)], METAL[2])                                      # fur torn off: the metal skull
    put(a, [(30, 12)], METAL[0])
    grime(a, 6)
    P['head'] = a
    # ---------------- 'hair': a matted crest of feathers - and her auburn hair hanging out at the neck
    im = blank(); d = ImageDraw.Draw(im)
    for (x0, x1, y1) in [(32, 29, 0), (34, 34, 0), (36, 38, 1)]: d.line([(x0, 5), (x1, y1)], fill=hx(FURD[2]), width=2)
    a = shade(im, FURD)
    for (x, y) in [(30, 19), (30, 20), (30, 21), (29, 22), (31, 20), (31, 21), (31, 22), (30, 23)]: a[y, x] = hx(0x8a4426)  # her hair
    a[20, 31] = hx(0xb0603a); a[19, 30] = hx(0x5e2a16)
    P['hair'] = a
    # ---------------- front arm: furred, a big mascot mitten with a finger missing
    im = blank(); d = ImageDraw.Draw(im); limb(d, (38, 24), (42, 31), 6, hx(FUR[2])); a = shade(im, FUR); grime(a, 2); P['fupper'] = a
    im = blank(); d = ImageDraw.Draw(im); limb(d, (42, 31), (44, 27), 5, hx(FUR[2])); a = shade(im, FUR); put(a, [(43, 29), (44, 30)], METAL[2]); P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([41, 21, 48, 28], fill=hx(FUR[2]))
    for (tx, ty) in ((49, 19), (50, 23)): limb(d, (45, 23), (tx, ty), 2, hx(FUR[2]))
    a = shade(im, FUR); im2 = blank(); d2 = ImageDraw.Draw(im2); d2.line([(46, 22), (49, 17)], fill=hx(METAL[2]), width=1)   # a bare metal finger
    mt = shade(im2, METAL); m = mt[..., 3] > 0; a[m] = mt[m]
    grime(a, 2)
    P['ffist'] = a
    return P

def draw_parts():
    if STYLE == 'wrong': return draw_mascot()
    W = STYLE == 'wrong'
    C = WRONG if W else CALM
    K, T, B, CO, HR = C['skin'], C['tight'], C['boot'], C['coat'], C['hair']
    P = {}
    # ---------------- legs: slim; under the coat only the shins show
    for side, hip, knee, ank, toe in (('b', (28, 40), (25, 48), (24, 55), -1), ('f', (37, 40), (40, 48), (40, 55), 1)):
        TH = T if W else CO                                                    # (calm: her thighs are under the coat)
        im = blank(); d = ImageDraw.Draw(im); limb(d, hip, knee, 5 if not W else 4, hx(TH[2])); P[side + 'thigh'] = shade(im, TH)
        im = blank(); d = ImageDraw.Draw(im)
        if W:
            limb(d, knee, ank, 3, hx(T[2])); a = shade(im, T)
        else:
            limb(d, knee, (ank[0], 50), 4, hx(T[2]))                          # tights above the boot
            d.polygon([(ank[0] - 2, 51), (ank[0] + 1, 51), (ank[0] + 1, 56), (ank[0] - 2, 56)], fill=hx(B[2]))   # the boot's shaft
            a = np.array(im); tg = np.array(shade(Image.fromarray(np.where((np.arange(64)[:, None, None] < 51), a, 0).astype(np.uint8)), T))
            bt = shade(Image.fromarray(np.where((np.arange(64)[:, None, None] >= 51), a, 0).astype(np.uint8)), B)
            a = tg.copy(); m = bt[..., 3] > 0; a[m] = bt[m]
            put(a, [(ank[0] - 1, 52), (ank[0] - 1, 53)], B[0])                 # a shine on the rubber
        P[side + 'shin'] = a
        im = blank(); d = ImageDraw.Draw(im)
        x0 = ank[0] - 3
        if W:                                                                  # long grey feet, toes splayed
            d.polygon([(x0 + 1, 54), (x0 + 5, 54), (x0 + 10, 57), (x0 + 10, 58), (x0, 58)], fill=hx(K[2]))
            a = shade(im, K); put(a, [(x0 + 6, 58), (x0 + 8, 58), (x0 + 10, 58)], K[4])
        else:                                                                  # the boot's foot, a dark sole
            d.polygon([(x0 + 1, 55), (x0 + 5, 55), (x0 + 7, 57), (x0 + 7, 58), (x0 + 1, 58)], fill=hx(B[2]))
            a = shade(im, B); put(a, [(x, 58) for x in range(x0 + 1, x0 + 8)], 0x2a1010); put(a, [(x0 + 2, 56)], B[0])
        P[side + 'shoe'] = a
    # ---------------- back arm: a thin sleeve and a small hand (calm: holding her poster)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (27, 24), (25, 31), 4, hx(CO[2])); a = shade(im, CO); put(a, [(26, 27)], CO[3]); P['bupper'] = a
    im = blank(); d = ImageDraw.Draw(im)
    end = (27, 40) if W else (26, 37)
    limb(d, (25, 31), end, 4, hx(CO[2]))
    a = shade(im, CO)
    im2 = blank(); d2 = ImageDraw.Draw(im2)
    if W:
        d2.ellipse([25, 39, 28, 42], fill=hx(K[2]))
        for (tx, ty) in ((24, 47), (27, 48), (29, 46)): d2.line([(26, 41), (tx, ty)], fill=hx(K[2]), width=1)
        hand = shade(im2, K); put(hand, [(24, 47), (27, 48), (29, 46)], 0xe8e8e0)
    else:
        d2.ellipse([24, 37, 27, 40], fill=hx(K[2])); hand = shade(im2, K)
    m = hand[..., 3] > 0; a[m] = hand[m]
    P['bfore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    if not W:                                                                  # the torn poster: MISSING band, a little face
        d.polygon([(21, 36), (28, 35), (29, 44), (25, 45), (23, 43), (21, 44)], fill=hx(C['paper'][2]))
        a = shade(im, C['paper'])
        put(a, [(x, y) for y in (37, 38) for x in range(22, 28)], 0xc8281e)
        put(a, [(24, 40), (25, 40), (24, 41), (25, 41), (23, 42), (24, 42), (25, 42), (26, 42)], 0x4a3e34)
    else:
        a = np.array(im)
    P['poster'] = a
    # ---------------- torso: the raincoat - narrow shoulders, belted, an A-line skirt with folds
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(29, 21), (37, 21), (38, 24), (38, 33), (40, 46), (37, 47), (30, 47), (26, 46), (28, 33), (28, 24)], fill=hx(CO[2]))
    d.polygon([(28, 18), (31, 17), (32, 21), (28, 22)], fill=hx(CO[2]))      # the collar turned up at the back
    a = shade(im, CO)
    put(a, [(x, y) for y in (33, 34) for x in range(27, 40)], CO[3]); put(a, [(x, 33) for x in range(28, 39)], CO[4])   # the belt
    put(a, [(34, 33), (35, 33), (34, 34), (35, 34)], 0xd8c89a if not W else 0x6a5a2a)                                   # buckle
    put(a, [(36, y) for y in range(22, 47)], CO[3])                            # the front edge of the coat
    for y in (25, 29, 38, 42): put(a, [(37, y)], CO[4])                        # buttons
    for x, y0 in ((30, 36), (33, 37), (39, 38)): put(a, [(x, y) for y in range(y0, 46)], CO[3])   # folds in the skirt
    put(a, [(29, 24), (29, 25), (29, 26)], CO[1])                              # light on the shoulder
    put(a, [(32, 21), (33, 21), (34, 21)], K[2]); put(a, [(33, 22)], K[3])     # her neck in the collar
    if W:                                                                      # torn: a ragged hem, holes, stains
        for x in range(25, 42):
            cut = int(2 + 2.5 * abs(np.sin(x * 1.7)) + (x % 3))
            for y in range(48 - cut, 49):
                if a[y, x, 3]: a[y, x] = 0
        for (x, y) in [(30, 27), (31, 27), (30, 28), (37, 30), (29, 40), (30, 41), (34, 44)]: put(a, [(x, y)], CO[4])
        for (x, y) in [(32, 30), (33, 31), (31, 38), (38, 40), (29, 34)]: put(a, [(x, y)], 0x4a5a3a)
        ring = (a[..., 3] == 0) & (np.roll(a[..., 3] > 0, 1, 0) | np.roll(a[..., 3] > 0, 1, 1) | np.roll(a[..., 3] > 0, -1, 1))
        ring[:38] = False; a[ring] = hx(CO[4])
    P['torso'] = a
    # ---------------- head: a small, narrow face
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([32, 17, 34, 22], fill=hx(K[2]))                               # neck
    d.polygon([(31, 9), (37, 9), (38, 12), (39, 15), (38, 16), (37, 18), (35, 19), (32, 19), (31, 17)], fill=hx(K[2]))
    if W: d.polygon([(34, 17), (38, 17), (37, 25), (35, 25)], fill=hx(K[2]))  # the jaw, hanging far too low
    a = shade(im, K)
    if W:
        put(a, [(x, y) for y in range(17, 24) for x in range(35, 37)], 0x050505)   # the open mouth
        put(a, [(35, 17), (36, 24)], 0xd8d8cc)                                     # a couple of teeth
        put(a, [(34, 13), (37, 13)], 0x050505); a[13, 34] = hx(0xffffff); a[13, 37] = hx(0xffffff)   # pinprick eyes in dark sockets
        put(a, [(34, 12), (37, 12), (33, 13)], K[4])
        put(a, [(34, 14), (34, 15), (37, 15), (37, 16)], K[3])                     # streaks down the face
    else:
        put(a, [(34, 13), (37, 13)], 0x3a2a2a); put(a, [(35, 13)], 0xfbe9dc); put(a, [(36, 12), (34, 12)], HR[3])   # tired eyes, brows
        put(a, [(34, 14), (37, 14)], 0xc89a8a)                                   # dark circles
        put(a, [(39, 15)], K[3]); put(a, [(36, 17), (37, 17)], 0xb06a6a)         # nose, a small worried mouth
        put(a, [(32, 13), (32, 14)], K[3])                                       # the ear's shadow
    P['head'] = a
    # ---------------- hair
    im = blank(); d = ImageDraw.Draw(im)
    if W:                                                                      # black, soaked, hanging in long strands
        d.polygon([(29, 13), (29, 8), (32, 6), (37, 6), (39, 8), (39, 10), (33, 10), (31, 13)], fill=hx(HR[2]))
        for (x0, x1, y1) in [(30, 27, 30), (31, 29, 33), (32, 31, 27), (33, 33, 21), (38, 40, 23), (39, 41, 27)]:
            d.line([(x0, 8), (x1, y1)], fill=hx(HR[2]), width=2)
        a = shade(im, HR)
        a[12:26, 34:38] = 0                                                    # the face shows between the strands
        for (x, y) in [(31, 12), (30, 18), (31, 22), (39, 14), (40, 19)]: put(a, [(x, y)], HR[0])   # wet shine
    else:                                                                      # a neat auburn bob with a fringe
        d.polygon([(29, 18), (28, 11), (30, 7), (36, 6), (39, 8), (40, 11), (38, 10), (34, 11), (32, 13), (31, 19)], fill=hx(HR[2]))
        a = shade(im, HR)
        for (x0, y0, y1) in [(30, 10, 17), (32, 8, 12), (35, 7, 10)]: put(a, [(x0, y) for y in range(y0, y1)], HR[3])   # strands
        put(a, [(31, 8), (32, 7), (33, 7)], HR[0]); put(a, [(29, 12), (29, 13)], HR[1])
    P['hair'] = a
    # ---------------- front arm: sleeve, a small hand (wrong: a grey forearm, long claws)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (38, 24), (42, 31), 4, hx(CO[2])); a = shade(im, CO); put(a, [(39, 26)], CO[1]); P['fupper'] = a
    im = blank(); d = ImageDraw.Draw(im)
    if W: limb(d, (42, 31), (44, 27), 3, hx(K[2])); P['ffore'] = shade(im, K)
    else:
        limb(d, (42, 31), (44, 27), 4, hx(CO[2])); a = shade(im, CO); put(a, [(43, 28), (44, 28)], CO[3]); P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    if W:
        d.ellipse([42, 24, 46, 28], fill=hx(K[2]))
        for (tx, ty) in ((51, 17), (53, 21), (52, 25), (48, 15)): d.line([(44, 25), (tx, ty)], fill=hx(K[2]), width=1)
        a = shade(im, K); put(a, [(51, 17), (53, 21), (52, 25), (48, 15)], 0xe8e8e0)
    else:
        d.ellipse([42, 24, 46, 28], fill=hx(K[2])); a = shade(im, K); put(a, [(43, 25)], K[0])
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
