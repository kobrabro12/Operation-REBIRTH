"""NU - the nu-metal frontman (a TEST FIGHTER). His drawing, built part by part so the puppet rig
(tools/sprites/puppet.py) can animate each piece on its own.

An original design: lanky, bleached spiked hair with acid-green tips, a black face-paint stripe across
the eyes, goggles pushed up on his forehead, an oversized charcoal hoodie with a green 'NU' print and
drawstrings, baggy pants with a wallet chain, white high-tops with a green stripe, and a chrome mic
with a glowing green grille on a long cable.

Every part is drawn on its own 64x64 layer (facing right, feet on row 58): flat colour, then a cel
shade (lit from the upper left), then a dark outline around the part - so overlapping parts stay
readable. draw_parts() returns {name: RGBA array}; the joints are in JOINTS.
"""
import numpy as np
from PIL import Image, ImageDraw

def hx(c): return (c >> 16 & 255, c >> 8 & 255, c & 255, 255)

OUT = 0x14101c
PAL = {
    'skin': (0xf0c09a, 0xd8986e, 0x9a603e),
    'hair': (0xfaf4dc, 0xe2d6a2, 0xb0a070),
    'tip': (0xc8ff5a, 0x9be32a, 0x5a9a14),
    'hood': (0x4a4656, 0x2e2a36, 0x1c1a22),
    'pants': (0x4c4858, 0x34303e, 0x221f2a),
    'shoe': (0xffffff, 0xe0e4ea, 0x9aa0aa),
    'chrome': (0xf4f8fc, 0xb8c0ca, 0x6c7480),
    'acid': (0xd8ff7a, 0x9be32a, 0x5a9a14),
    'band': (0x3a3644, 0x24212c, 0x14101c),
}

# joint positions (x, y) in the 64x64 frame
JOINTS = {
    'neck': (33, 21), 'hip': (32, 39),
    'bshoulder': (27, 24), 'belbow': (25, 31),
    'fshoulder': (38, 24), 'felbow': (42, 31), 'fhand': (44, 25),
    'bhip': (28, 40), 'bknee': (24, 48), 'fhip': (37, 40), 'fknee': (41, 48),
}

def blank(): return Image.new('RGBA', (64, 64), (0, 0, 0, 0))

def capsule(d, a, b, w, fill):
    """A limb: a thick line with round ends."""
    (x0, y0), (x1, y1) = a, b
    d.line([a, b], fill=fill, width=w)
    r = w / 2 - 0.5
    for (x, y) in (a, b): d.ellipse([x - r, y - r, x + r, y + r], fill=fill)

def finish(img, pal, outline=True, rim=True):
    """Cel shade a flat-filled part with its 3-tone palette (light top/left, dark bottom/right) and
    outline it. Pixels already painted in other colours (details) are kept."""
    a = np.array(img)
    solid = a[..., 3] > 0
    base = np.array(hx(pal[1]))
    is_base = solid & np.all(a == base, axis=-1)
    H, W = solid.shape
    def sh(m, dy, dx):                                  # shift without wrapping round the edges
        o = np.zeros_like(m)
        o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
        return o
    lit = is_base & (~sh(solid, 1, 0) | ~sh(solid, 0, 1))                     # empty above or to the left
    dark = is_base & (~sh(solid, -1, 0) | ~sh(solid, 0, -1) | ~sh(solid, -2, 0) | ~sh(solid, 0, -2))   # near bottom/right
    if rim:
        a[dark] = hx(pal[2]); a[lit & ~dark] = hx(pal[0])
    if outline:
        ring = ~solid & (sh(solid, 1, 0) | sh(solid, -1, 0) | sh(solid, 0, 1) | sh(solid, 0, -1))
        a[ring] = hx(OUT)
    return a

def draw_parts_v1():
    """The first drawing (chunky, black outlines). The costumes (nu_*_draw.py) are still built on it."""
    P = {}
    # ---------------- back leg (behind everything): thigh, then shin + shoe
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['bhip'], JOINTS['bknee'], 9, hx(PAL['pants'][1]))
    P['bthigh'] = finish(im, PAL['pants'])
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(20, 47), (28, 47), (27, 55), (18, 55)], fill=hx(PAL['pants'][1]))   # baggy shin, flared at the bottom
    P['bshin'] = finish(im, PAL['pants'])
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(17, 53), (24, 53), (27, 56), (27, 58), (15, 58), (15, 55)], fill=hx(PAL['shoe'][1]))
    a = finish(im, PAL['shoe'])
    a[57, 15:28] = hx(0x6a707a)                                           # sole
    a[55, 17:25] = hx(PAL['acid'][1])                                     # green stripe
    P['bshoe'] = a
    # ---------------- front leg
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['fhip'], JOINTS['fknee'], 9, hx(PAL['pants'][1]))
    a = finish(im, PAL['pants'])
    a[43:46, 39] = hx(PAL['pants'][0])                                    # a crease
    P['fthigh'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(37, 47), (45, 47), (46, 55), (38, 55)], fill=hx(PAL['pants'][1]))
    P['fshin'] = finish(im, PAL['pants'])
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(38, 53), (45, 53), (49, 56), (49, 58), (37, 58), (37, 55)], fill=hx(PAL['shoe'][1]))
    a = finish(im, PAL['shoe'])
    a[57, 37:50] = hx(0x6a707a)
    a[55, 39:47] = hx(PAL['acid'][1]); a[54, 43] = hx(PAL['acid'][1])
    P['fshoe'] = a
    # ---------------- back arm (behind the torso)
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['bshoulder'], JOINTS['belbow'], 6, hx(PAL['hood'][1]))
    P['bupper'] = finish(im, PAL['hood'])
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['belbow'], (27, 36), 5, hx(PAL['hood'][1]))
    d.rectangle([25, 36, 29, 37], fill=hx(PAL['band'][1]))                # spiked wristband
    d.ellipse([25, 37, 29, 40], fill=hx(PAL['skin'][1]))                  # fist
    a = finish(im, PAL['hood'])
    for x in (25, 27, 29): a[35, x] = hx(PAL['chrome'][0])                # the band's studs
    sk = np.all(a == np.array(hx(PAL['skin'][1])), -1); a[sk & (np.arange(64)[None, :] < 27)] = hx(PAL['skin'][0])
    P['bfore'] = a
    # ---------------- torso: an oversized hoodie, chain hanging below the hem
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(25, 22), (41, 22), (42, 30), (41, 41), (25, 41), (24, 30)], fill=hx(PAL['hood'][1]))
    d.polygon([(26, 19), (31, 18), (32, 23), (26, 24)], fill=hx(PAL['hood'][1]))   # the hood bunched behind the neck
    a = finish(im, PAL['hood'])
    G = hx(PAL['acid'][1]); GL = hx(PAL['acid'][0]); GD = hx(PAL['acid'][2])
    # chest print: a jagged N U
    for (x, y) in [(27, 27), (27, 28), (27, 29), (27, 30), (28, 28), (29, 29), (30, 27), (30, 28), (30, 29), (30, 30),
                   (32, 27), (32, 28), (32, 29), (33, 30), (34, 30), (35, 27), (35, 28), (35, 29)]:
        a[y, x] = G
    a[27, 27] = GL; a[27, 32] = GL; a[26, 30] = GD
    for y in (23, 24, 25, 26): a[y, 35] = G                               # drawstrings
    for y in (23, 24, 25): a[y, 37] = G
    a[26, 37] = GD; a[27, 35] = GD
    a[35, 27:40] = hx(PAL['hood'][2]); a[36, 27] = hx(PAL['hood'][2]); a[36, 39] = hx(PAL['hood'][2])   # pocket seam
    a[40, 25:42] = hx(PAL['band'][1])                                     # hem band
    for (x, y) in [(38, 41), (37, 42), (36, 43), (35, 44), (34, 44), (33, 44), (32, 44), (31, 43), (30, 42), (29, 41)]:   # wallet chain
        a[y, x] = hx(PAL['chrome'][1] if (x + y) % 2 else PAL['chrome'][0])
    P['torso'] = a
    # ---------------- head: face, eye stripe, lip ring, goggles, spiked bleached hair with green tips
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([31, 18, 35, 22], fill=hx(PAL['skin'][1]))               # neck
    d.polygon([(29, 9), (38, 9), (39, 13), (40, 15), (39, 16), (39, 19), (36, 21), (31, 21), (29, 18)], fill=hx(PAL['skin'][1]))
    a = finish(im, PAL['skin'])
    a[21, 32:36] = hx(PAL['skin'][2])
    a[16:19, 33] = hx(PAL['skin'][2]); a[19, 34:36] = hx(PAL['skin'][2])   # cheekbone and jaw
    a[15, 34:37] = hx(PAL['skin'][0])
    a[12:15, 31:40] = hx(OUT)                                             # face-paint stripe across the eyes
    a[13, 36] = hx(0xf4f8fc); a[13, 37] = hx(0xc8ff5a)                    # an eye glinting green through the paint
    a[13, 33] = hx(0x4a4656)
    a[15, 40] = hx(PAL['skin'][1]); a[16, 39] = hx(PAL['skin'][2])        # nose
    a[18, 36:39] = hx(PAL['skin'][2]); a[18, 39] = hx(OUT)                # mouth
    a[19, 38] = hx(PAL['chrome'][0])                                      # lip ring
    a[14:17, 30] = hx(PAL['skin'][2]); a[15, 29] = hx(PAL['skin'][1])    # ear
    a[16, 29] = hx(PAL['chrome'][1])                                      # earring
    P['head'] = a
    im = blank(); d = ImageDraw.Draw(im)
    H1 = hx(PAL['hair'][1])
    d.polygon([(27, 13), (26, 8), (29, 5), (36, 5), (39, 7), (40, 10), (36, 10), (31, 10), (29, 14)], fill=H1)
    # spikes swept up and back: (base left, tip, base right)
    spikes = [((26, 9), (19, 3), (28, 6)), ((28, 6), (23, 0), (31, 5)), ((30, 5), (28, 0), (34, 5)), ((33, 5), (34, 0), (37, 6)), ((36, 6), (40, 2), (39, 8))]
    for tri in spikes: d.polygon(tri, fill=H1)
    a = finish(im, PAL['hair'])
    tipcol = [hx(PAL['tip'][0]), hx(PAL['tip'][1]), hx(PAL['tip'][1]), hx(PAL['tip'][2])]
    for (b0, tip, b1) in spikes:                                          # acid-green tips: colour the last few pixels toward each tip
        tx, ty = tip; cx, cy = (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2
        for k in range(5):
            f = k / 6; x = int(round(tx + (cx - tx) * f)); y = int(round(ty + (cy - ty) * f))
            for (yy, xx) in ((y, x), (y + 1, x), (y, x + 1)):
                if 0 <= yy < 64 and 0 <= xx < 64 and a[yy, xx, 3] and not np.all(a[yy, xx] == np.array(hx(OUT))): a[yy, xx] = tipcol[min(3, k)]
    # goggles pushed up on the forehead
    for x in range(28, 40): a[9, x] = hx(PAL['band'][1]) if a[9, x, 3] else a[9, x]
    a[8:11, 35:39] = hx(PAL['chrome'][1]); a[8, 35:39] = hx(PAL['chrome'][0])
    a[9, 36:38] = hx(PAL['acid'][1]); a[9, 36] = hx(PAL['acid'][0])
    a[11, 35:39] = hx(OUT)
    P['hair'] = a
    # ---------------- front arm: upper arm, then forearm + fist + the mic on its cable
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['fshoulder'], JOINTS['felbow'], 6, hx(PAL['hood'][1]))
    P['fupper'] = finish(im, PAL['hood'])
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['felbow'], (44, 27), 5, hx(PAL['hood'][1]))
    a = finish(im, PAL['hood'])
    a[27:29, 42:46] = hx(PAL['band'][1]); a[27, 43] = hx(PAL['chrome'][0]); a[27, 45] = hx(PAL['chrome'][0])
    P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.line([(43, 30), (41, 34), (40, 38), (42, 41), (45, 40)], fill=hx(0x24212c), width=1)   # cable, looping down
    m = np.array(im)
    d.polygon([(43, 21), (46, 21), (45, 28), (44, 28)], fill=hx(PAL['chrome'][1]))     # mic handle
    d.ellipse([42, 15, 47, 20], fill=hx(PAL['chrome'][1]))                               # grille
    a = finish(im, PAL['chrome'])
    a[17, 44] = hx(PAL['acid'][0]); a[17, 45] = hx(PAL['acid'][1]); a[18, 44:46] = hx(PAL['acid'][1]); a[16, 44] = hx(0xffffff)   # green glow
    a[20, 43:47] = hx(PAL['acid'][2])
    a[np.array(m)[..., 3] > 0] = m[np.array(m)[..., 3] > 0]               # the cable over its outline
    P['mic'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([42, 23, 47, 29], fill=hx(PAL['skin'][1]))                  # the fist around the handle
    a = finish(im, PAL['skin'])
    a[25, 43:47] = hx(PAL['skin'][2]); a[24, 44] = hx(PAL['skin'][0])
    P['ffist'] = a
    # ---------------- a spray can in the back fist (only out for GRAFFITI TAG)
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([28, 33, 31, 40], fill=hx(PAL['acid'][1]))
    a = finish(im, PAL['acid'])
    a[32, 29:31] = hx(PAL['chrome'][1]); a[31, 30] = hx(0xffffff)          # cap and nozzle
    a[36, 28:32] = hx(OUT)                                               # label band
    P['can'] = a
    return P

# ======================================================================= the drawing (v2)
# Drawn to sit next to Mason's Soul Summoner: slim and tall, a small head, long limbs, fine 1px detail, five-tone
# shading lit from the upper left, and each piece outlined in a dark shade of its own colour (no black outline).
P5 = {   # highlight, light, mid, shadow, outline
    'skin': (0xf8d8bc, 0xe8b48e, 0xc88a64, 0x965c40, 0x4a2a1c),
    'hair': (0xfffbea, 0xf4e8bc, 0xdccc90, 0xae9a62, 0x5c4e2a),
    'tip': (0xeeffb0, 0xc8ff5a, 0x9be32a, 0x5a9a14, 0x2a4a08),
    'hood': (0x76728a, 0x55516a, 0x3c3850, 0x26233a, 0x100e1c),
    'pants': (0x5e5a70, 0x45415a, 0x312e44, 0x211f30, 0x0c0a16),
    'shoe': (0xffffff, 0xf0f2f6, 0xccd0d8, 0x8e949e, 0x3a3e48),
    'chrome': (0xffffff, 0xdce4ec, 0xa8b2be, 0x6c7684, 0x2a2e38),
    'band': (0x4a4658, 0x34303e, 0x24212c, 0x16141c, 0x08060c),
}

def shade5(img, pal):
    """Light from the upper left: a highlight edge, the mid tone, a two-pixel shadow down the lower right, and an
    outline in the material's own darkest shade. Pixels painted in other colours (details) are kept."""
    a = np.array(img)
    solid = a[..., 3] > 0
    base = np.all(a[..., :3] == np.array(hx(pal[2])[:3]), -1) & solid
    H, W = solid.shape
    def sh(m, dy, dx):
        o = np.zeros_like(m)
        o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
        return o
    ul = ~sh(solid, 1, 0) | ~sh(solid, 0, 1); ul2 = ~sh(solid, 2, 0) | ~sh(solid, 0, 2)
    dr = ~sh(solid, -1, 0) | ~sh(solid, 0, -1); dr2 = ~sh(solid, -2, 0) | ~sh(solid, 0, -2)
    a[base & dr2] = hx(pal[3])
    a[base & ul2 & ~dr2] = hx(pal[1])
    a[base & ul & ~dr] = hx(pal[0])
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

def draw_parts():
    """NU, slim: a lanky frontman in a fitted charcoal hoodie, tapered pants and white high-tops."""
    S, HR, TP, HD, PN, SH, CH, BD = (P5[k] for k in ('skin', 'hair', 'tip', 'hood', 'pants', 'shoe', 'chrome', 'band'))
    G = TP
    P = {}
    # ---------------- legs: long and slim, the pants bunching a little over the high-tops
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 54)), ('f', (37, 40), (40, 48), (40, 54))):
        im = blank(); d = ImageDraw.Draw(im); limb(d, hip, knee, 5, hx(PN[2]))
        a = shade5(im, PN); put(a, [(knee[0] + (1 if side == 'f' else -1), knee[1] - 2)], PN[3])      # a crease at the knee
        P[side + 'thigh'] = a
        im = blank(); d = ImageDraw.Draw(im); limb(d, knee, ank, 5, hx(PN[2]))
        d.polygon([(ank[0] - 3, ank[1] - 2), (ank[0] + 3, ank[1] - 2), (ank[0] + 3, ank[1] + 1), (ank[0] - 3, ank[1] + 1)], fill=hx(PN[2]))   # bunched at the ankle
        a = shade5(im, PN); put(a, [(ank[0] - 1, ank[1] - 1), (ank[0] + 1, ank[1])], PN[3])
        P[side + 'shin'] = a
        im = blank(); d = ImageDraw.Draw(im); x0 = ank[0] - 3                                  # a white high-top
        d.polygon([(x0, 54), (x0 + 5, 54), (x0 + 7, 56), (x0 + 9, 56), (x0 + 9, 58), (x0, 58)], fill=hx(SH[2]))
        a = shade5(im, SH)
        put(a, [(x, 58) for x in range(x0, x0 + 10)], 0x3a3e48); put(a, [(x, 57) for x in range(x0 + 1, x0 + 9)], 0xb8bcc6)   # the sole
        put(a, [(x0 + 2, 55), (x0 + 3, 55), (x0 + 4, 56), (x0 + 5, 56), (x0 + 6, 56)], TP[2]); put(a, [(x0 + 3, 54)], TP[1])   # the green stripe
        put(a, [(x0 + 7, 56), (x0 + 8, 56)], 0xffffff)
        P[side + 'shoe'] = a
    # ---------------- back arm: a hoodie sleeve, a spiked wristband, a fist
    im = blank(); d = ImageDraw.Draw(im); limb(d, (27, 24), (25, 31), 4, hx(HD[2])); a = shade5(im, HD); put(a, [(26, 27)], HD[3]); P['bupper'] = a
    im = blank(); d = ImageDraw.Draw(im); limb(d, (25, 31), (26, 36), 4, hx(HD[2])); a = shade5(im, HD)
    im2 = blank(); d2 = ImageDraw.Draw(im2); d2.rectangle([24, 35, 28, 36], fill=hx(BD[2])); band = shade5(im2, BD); m = band[..., 3] > 0; a[m] = band[m]
    put(a, [(24, 35), (26, 35), (28, 35)], CH[0])                                                  # studs
    put(a, [(24, 34), (25, 34), (26, 34), (27, 34)], G[3])                                          # green cuff
    im2 = blank(); d2 = ImageDraw.Draw(im2); d2.ellipse([24, 36, 28, 40], fill=hx(S[2])); fist = shade5(im2, S); m = fist[..., 3] > 0; a[m] = fist[m]
    put(a, [(25, 38), (26, 38)], S[3])
    P['bfore'] = a
    # ---------------- torso: a fitted charcoal hoodie, hood bunched behind the neck, the NU print, a wallet chain
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(29, 21), (37, 21), (39, 23), (38, 31), (38, 38), (39, 41), (28, 41), (27, 38), (28, 31), (27, 23)], fill=hx(HD[2]))   # tapering to the waist
    d.polygon([(27, 18), (31, 17), (32, 22), (27, 23)], fill=hx(HD[2]))                            # the hood behind his neck
    a = shade5(im, HD)
    put(a, [(28, 19), (29, 18), (30, 19)], HD[3]); put(a, [(29, 20)], HD[4])                      # inside the hood
    put(a, [(32, 21), (33, 21), (34, 21)], S[2]); put(a, [(33, 22)], S[3])                        # his neck in the collar
    G = TP
    for (x, y) in [(29, 27), (29, 28), (29, 29), (29, 30), (30, 28), (31, 29), (32, 27), (32, 28), (32, 29), (32, 30),   # a small N U print
                   (34, 27), (34, 28), (34, 29), (35, 30), (36, 27), (36, 28), (36, 29)]:
        put(a, [(x, y)], G[2])
    put(a, [(29, 27), (32, 27), (34, 27), (36, 27)], G[1])
    put(a, [(35, y) for y in range(22, 25)] + [(37, y) for y in range(22, 24)], G[2]); put(a, [(35, 25), (37, 24)], CH[1])   # drawstrings with metal tips
    put(a, [(x, 33) for x in range(29, 38)], HD[3]); put(a, [(29, 34), (37, 34)], HD[3])           # the pouch pocket
    put(a, [(x, 39) for x in range(27, 40)], BD[2]); put(a, [(x, 40) for x in range(27, 40)], BD[3])   # the ribbed hem...
    for x in range(28, 39, 2): put(a, [(x, 39)], BD[1])
    put(a, [(x, 38) for x in range(28, 39)], G[3])                                                   # ...with an acid-green trim
    put(a, [(28, 18), (29, 17), (30, 18), (31, 18)], G[3]); put(a, [(33, y) for y in range(22, 38, 2)], HD[3])   # the hood's green lining; a zip
    put(a, [(28, 24), (28, 25), (28, 26)], HD[1]); put(a, [(36, 30), (37, 31)], HD[3])             # light on the shoulder, a fold
    im2 = blank(); d2 = ImageDraw.Draw(im2)
    for (x, y) in [(38, 41), (37, 42), (36, 43), (35, 43), (34, 43), (33, 42)]: im2.putpixel((x, y), hx(CH[2]))   # the wallet chain, hanging
    c = np.array(im2); m = c[..., 3] > 0; a[m] = c[m]; put(a, [(37, 42), (35, 43)], CH[0])
    a[42, 37] = hx(CH[0]); a[43, 35] = hx(CH[0]); a[43, 34] = hx(CH[3])
    P['torso'] = a
    # ---------------- head: small, narrow; the black face-paint stripe across the eyes, one eye glinting green
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([32, 17, 34, 21], fill=hx(S[2]))
    d.polygon([(31, 9), (37, 9), (38, 12), (39, 15), (38, 16), (37, 18), (35, 19), (32, 19), (31, 17)], fill=hx(S[2]))
    a = shade5(im, S)
    put(a, [(x, 13) for x in range(32, 40)] + [(x, 12) for x in range(33, 39)] + [(x, 14) for x in range(34, 39)], 0x1a1424)   # the paint stripe
    put(a, [(37, 13)], 0xc8ff5a); put(a, [(36, 13)], 0xf4f8fc); put(a, [(34, 13)], 0x3a3450)        # an eye glinting green through it
    put(a, [(39, 15)], S[3]); put(a, [(38, 15)], S[1])                                              # nose
    put(a, [(36, 17), (37, 17)], 0x8a4a3a); put(a, [(38, 17)], CH[0])                              # mouth, lip ring
    put(a, [(32, 13), (32, 14), (32, 15)], S[3]); put(a, [(31, 15)], CH[1])                        # ear and an earring
    put(a, [(35, 16), (36, 16)], S[3])                                                              # cheekbone
    P['head'] = a
    # ---------------- hair: bleached, spiked up and back, acid-green tips; goggles pushed up into it
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(30, 13), (29, 9), (31, 7), (36, 6), (39, 8), (39, 10), (35, 10), (32, 11), (31, 13)], fill=hx(HR[2]))
    spikes = [((30, 10), (24, 6), (31, 8)), ((30, 8), (25, 2), (32, 7)), ((32, 7), (29, 0), (34, 6)), ((34, 6), (34, 0), (36, 6)), ((36, 6), (39, 1), (38, 7)), ((37, 8), (42, 4), (39, 9))]
    for tri in spikes: d.polygon(tri, fill=hx(HR[2]))
    a = shade5(im, HR)
    for (b0, tip, b1) in spikes:                                                                    # strands down each spike, green tips
        tx, ty = tip; cx, cy = (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2
        for k in range(6):
            f = k / 7; x = int(round(tx + (cx - tx) * f)); y = int(round(ty + (cy - ty) * f))
            put(a, [(x, y)], TP[min(3, k // 2 + (k > 3))] if k < 4 else HR[3] if k == 5 else HR[1])
    put(a, [(x, 9) for x in range(30, 39)], BD[3])                                                  # the goggle strap...
    put(a, [(35, 8), (36, 8), (37, 8), (35, 9), (36, 9), (37, 9)], CH[2]); put(a, [(35, 8), (36, 8)], CH[0])   # ...and lenses
    put(a, [(36, 9)], TP[1]); put(a, [(35, 10), (36, 10), (37, 10)], CH[4])
    P['hair'] = a
    # ---------------- front arm: sleeve, wristband, then the mic on its cable and the fist around it
    im = blank(); d = ImageDraw.Draw(im); limb(d, (38, 24), (42, 31), 4, hx(HD[2])); a = shade5(im, HD); put(a, [(39, 26)], HD[1]); P['fupper'] = a
    im = blank(); d = ImageDraw.Draw(im); limb(d, (42, 31), (44, 27), 4, hx(HD[2])); a = shade5(im, HD)
    im2 = blank(); d2 = ImageDraw.Draw(im2); d2.rectangle([42, 27, 45, 28], fill=hx(BD[2])); band = shade5(im2, BD); m = band[..., 3] > 0; a[m] = band[m]
    put(a, [(43, 27), (45, 27)], CH[0]); put(a, [(42, 29), (43, 29), (44, 29)], G[3])               # studs; green cuff
    P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([44, 21, 45, 27], fill=hx(CH[2]))                                                   # the handle
    d.ellipse([42, 16, 47, 21], fill=hx(CH[2]))                                                     # the grille
    a = shade5(im, CH)
    for (x, y) in [(43, 18), (45, 18), (44, 19), (44, 17), (46, 19)]: put(a, [(x, y)], CH[3])        # the mesh
    put(a, [(44, 18), (45, 19)], TP[1]); put(a, [(43, 17)], 0xffffff)                               # glowing green inside
    put(a, [(x, 21) for x in range(43, 47)], TP[3])                                                 # its band
    cable = blank(); dc = ImageDraw.Draw(cable)
    dc.line([(44, 28), (42, 33), (41, 37), (42, 40), (45, 40)], fill=hx(0x24212c), width=1)       # the cable, looping down
    c = np.array(cable); m = c[..., 3] > 0; a[m] = c[m]
    P['mic'] = a
    im = blank(); d = ImageDraw.Draw(im); d.ellipse([42, 23, 46, 28], fill=hx(S[2])); a = shade5(im, S)
    put(a, [(43, 25), (44, 25), (45, 25)], S[3]); put(a, [(43, 24)], S[1])                         # knuckles
    P['ffist'] = a
    # ---------------- the spray can (only out for GRAFFITI TAG)
    im = blank(); d = ImageDraw.Draw(im); d.rectangle([28, 33, 30, 39], fill=hx(TP[2])); a = shade5(im, TP)
    put(a, [(28, 32), (29, 32), (30, 32)], CH[2]); put(a, [(29, 31)], 0xffffff); put(a, [(28, 36), (29, 36), (30, 36)], 0x1a1424)
    P['can'] = a
    return P

# draw order (back to front) and the rig: name -> (pivot, parent)
ORDER = ['bupper', 'bfore', 'can', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'hair', 'fupper', 'ffore', 'mic', 'ffist']
RIG = {
    'torso': ((32, 39), None),
    'head': ((33, 21), 'torso'), 'hair': ((33, 21), 'head'),
    'bupper': ((27, 24), 'torso'), 'bfore': ((25, 31), 'bupper'), 'can': ((27, 38), 'bfore'),
    'fupper': ((38, 24), 'torso'), 'ffore': ((42, 31), 'fupper'), 'mic': ((44, 26), 'ffore'), 'ffist': ((44, 26), 'ffore'),
    'bthigh': ((28, 40), None), 'bshin': ((26, 48), 'bthigh'), 'bshoe': ((24, 55), 'bshin'),
    'fthigh': ((36, 40), None), 'fshin': ((39, 48), 'fthigh'), 'fshoe': ((40, 55), 'fshin'),
}

def composite(P, hide=('can',)):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = P[n]; m = a[..., 3] > 0
        out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    im = Image.fromarray(c)
    bg = Image.new('RGBA', (64, 64), (120, 160, 220, 255)); bg.alpha_composite(im)
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'nu_preview.png')
