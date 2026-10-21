"""AERO - a TEST FIGHTER built out of the Frutiger Aero look: glossy glass and plastic, aqua and sky
blue, fresh grass green, bubbles, lens flares and a goldfish in a fishbowl.

An original design: a slim figure in a glossy white-and-aqua suit, a lime-green leaf scarf streaming
behind, aqua gloves and boots - and for a head, a glass fishbowl dome, half full of water, with a little
orange goldfish swimming inside (the goldfish is the one in charge). Everything has a hard white shine.

Drawn part by part like NU (tools/sprites/nu_draw.py, whose joints and rig layout it shares), so the
same puppet rig animates it. Parts are outlined in deep sea-blue instead of black - softer, glassier.
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw
from nu_draw import blank, capsule, hx

OUT = 0x0d3550
PAL = {
    'white': (0xffffff, 0xe6f4fb, 0xa8cfe0),
    'aqua': (0x9ff0ff, 0x3fc8ea, 0x1a7fb0),
    'lime': (0xd6ff9a, 0x8be04a, 0x4a9a1e),
    'glass': (0xffffff, 0xd8f6ff, 0x9ad8ee),
    'water': (0xbdf2ff, 0x6fd6f0, 0x2a9fd0),
    'fish': (0xffc070, 0xff8a2a, 0xc0501a),
}
JOINTS = nu_draw.JOINTS

def finish(img, pal):
    """nu_draw's cel shade + outline, outlined in sea-blue."""
    a = nu_draw.finish(img, pal)
    a[np.all(a == np.array(hx(nu_draw.OUT)), -1)] = hx(OUT)
    return a

def shine(a, pts, col=0xffffff):
    """Hard specular highlights - the Aero gloss."""
    for (x, y) in pts:
        if a[y, x, 3] and not np.all(a[y, x] == np.array(hx(OUT))): a[y, x] = hx(col)

def draw_parts():
    P = {}
    W, A, L = PAL['white'], PAL['aqua'], PAL['lime']
    # ---------------- back leg: white thigh, glossy aqua boot
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['bhip'], JOINTS['bknee'], 7, hx(W[1])); P['bthigh'] = finish(im, W)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['bknee'], (23, 54), 7, hx(A[1])); a = finish(im, A); shine(a, [(22, 49), (22, 50)]); P['bshin'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(19, 53), (26, 53), (28, 56), (28, 58), (17, 58), (17, 55)], fill=hx(A[1]))
    a = finish(im, A); a[57, 17:29] = hx(W[1]); a[56, 18:28] = hx(L[1]); shine(a, [(20, 54), (21, 54)]); P['bshoe'] = a
    # ---------------- front leg
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['fhip'], JOINTS['fknee'], 7, hx(W[1])); P['fthigh'] = finish(im, W)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['fknee'], (42, 54), 7, hx(A[1])); a = finish(im, A); shine(a, [(40, 49), (40, 50)]); P['fshin'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(38, 53), (45, 53), (49, 56), (49, 58), (37, 58), (37, 55)], fill=hx(A[1]))
    a = finish(im, A); a[57, 37:50] = hx(W[1]); a[56, 38:49] = hx(L[1]); shine(a, [(40, 54), (41, 54)]); P['fshoe'] = a
    # ---------------- back arm
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['bshoulder'], JOINTS['belbow'], 5, hx(W[1])); P['bupper'] = finish(im, W)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['belbow'], (27, 36), 4, hx(W[1])); d.ellipse([25, 35, 30, 40], fill=hx(A[1]))
    a = finish(im, W); a[np.all(a == np.array(hx(A[1])), -1) & (np.arange(64)[None, :] < 27)] = hx(A[0]); P['bfore'] = a
    # ---------------- the leaf scarf, streaming out behind
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(30, 21), (26, 21), (20, 23), (14, 27), (11, 32), (16, 30), (21, 27), (27, 25), (31, 24)], fill=hx(L[1]))
    a = finish(im, L)
    for x in range(14, 28): y = int(round(27 - (x - 14) * 0.38)); a[y, x] = hx(L[2]) if a[y, x, 3] else a[y, x]   # the leaf's middle vein
    shine(a, [(24, 23), (25, 22), (19, 25)])
    P['scarf'] = a
    # ---------------- torso: a glossy white suit, an aqua orb on the chest, a green belt
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(27, 21), (39, 21), (41, 26), (40, 33), (39, 40), (27, 40), (26, 33), (25, 26)], fill=hx(W[1]))
    a = finish(im, W)
    for y in range(38, 40): a[y, 27:40] = hx(L[1])                           # belt
    a[38, 27:40] = hx(L[0])
    for (x, y) in [(33, 26), (32, 27), (33, 27), (34, 27), (31, 28), (32, 28), (33, 28), (34, 28), (35, 28), (32, 29), (33, 29), (34, 29), (33, 30)]:
        a[y, x] = hx(A[1])                                                   # the chest orb
    a[30, 33] = hx(A[2]); a[29, 34] = hx(A[2]); a[27, 32] = hx(0xffffff); a[28, 31] = hx(A[0])
    a[23:37, 38] = hx(A[1]); a[24:36, 39] = hx(A[0])                         # aqua side panel
    shine(a, [(28, 23), (29, 23), (28, 24), (30, 22)])
    P['torso'] = a
    # ---------------- the fishbowl head: a glass dome, water in the bottom half, a collar ring
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([24, 4, 42, 22], fill=hx(PAL['glass'][1]))
    a = finish(im, PAL['glass'])
    yy, xx = np.mgrid[0:64, 0:64]
    inside = (a[..., 3] > 0) & ~np.all(a == np.array(hx(OUT)), -1)
    water = inside & (yy >= 13)
    a[water] = hx(PAL['water'][1])
    a[water & (yy == 13)] = hx(PAL['water'][0])                              # the water line
    a[water & (yy >= 19)] = hx(PAL['water'][2])
    for (x, y) in [(27, 7), (28, 6), (29, 6), (27, 8), (26, 9), (26, 10)]: a[y, x] = hx(0xffffff)   # the big glass shine
    a[8, 39] = hx(0xffffff); a[16, 40] = hx(PAL['water'][0])
    for (x, y) in [(31, 18), (37, 16)]: a[y, x] = hx(PAL['water'][0])        # bubbles in the water
    a[21, 28:39] = hx(PAL['aqua'][1]); a[22, 29:38] = hx(PAL['aqua'][2])      # collar ring
    P['head'] = a
    # ---------------- the goldfish (its own part, so it can swim around the bowl)
    im = blank(); d = ImageDraw.Draw(im)
    d.ellipse([32, 13, 37, 17], fill=hx(PAL['fish'][1]))
    d.polygon([(32, 15), (29, 13), (29, 17)], fill=hx(PAL['fish'][1]))     # tail
    a = np.array(im)
    s = a[..., 3] > 0
    a[s & (yy <= 13)] = hx(PAL['fish'][0]); a[s & (yy >= 17)] = hx(PAL['fish'][2])
    a[14, 35] = hx(0xffffff); a[14, 36] = hx(0x0d1a2a)                       # eye
    a[12, 34] = hx(PAL['fish'][1])                                           # dorsal fin
    ring = ~s & (np.roll(s, 1, 0) | np.roll(s, -1, 0) | np.roll(s, 1, 1) | np.roll(s, -1, 1))
    a[ring] = hx(0x8a3a10)
    P['fish'] = a
    # ---------------- front arm: white sleeve, aqua glove
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['fshoulder'], JOINTS['felbow'], 5, hx(W[1])); P['fupper'] = finish(im, W)
    im = blank(); d = ImageDraw.Draw(im); capsule(d, JOINTS['felbow'], (44, 27), 4, hx(W[1])); P['ffore'] = finish(im, W)
    im = blank(); d = ImageDraw.Draw(im); d.ellipse([42, 23, 47, 29], fill=hx(A[1])); a = finish(im, A); shine(a, [(43, 24), (44, 24)]); P['ffist'] = a
    return P

ORDER = ['scarf', 'bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'fish', 'fupper', 'ffore', 'ffist']
RIG = {
    'torso': ((32, 39), None), 'scarf': ((29, 22), 'torso'),
    'head': ((33, 21), 'torso'), 'fish': ((33, 14), 'head'),
    'bupper': ((27, 24), 'torso'), 'bfore': ((25, 31), 'bupper'),
    'fupper': ((38, 24), 'torso'), 'ffore': ((42, 31), 'fupper'), 'ffist': ((44, 26), 'ffore'),
    'bthigh': ((28, 40), None), 'bshin': ((24, 48), 'bthigh'), 'bshoe': ((24, 55), 'bshin'),
    'fthigh': ((37, 40), None), 'fshin': ((41, 48), 'fthigh'), 'fshoe': ((41, 55), 'fshin'),
}

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
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'aero_preview.png')
