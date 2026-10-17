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

def draw_parts():
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
