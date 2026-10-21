"""WHAT ONCE WAS - something that got lost in the Backrooms a long time ago (a TEST FIGHTER). Its drawing,
built part by part on the same joints as NU (tools/sprites/nu_draw.py) so the puppet rig animates it.

An original design: a hunched, deformed body whose skin has turned into the Backrooms' stained yellow
wallpaper - peeling in places, damp-stained, a torn hole in its side showing the dark. Its legs don't
match (one thin and bent wrong, one swollen), its front arm hangs far too long and ends in a three-
fingered claw. Its head is an old CRT television on a stretched neck, rabbit-ear antennae on top and a
power cord trailing down its spine. The screen shows one of several pictures - each is its own layer,
so a move picks what's on screen by hiding the others:
  scr_static   grey static (default)          scr_warn     a yellow warning triangle
  scr_missing  a MISSING poster (a face)      scr_eye      one huge staring eye
  scr_red      red static with a '!' (its CHANNEL: WARNING mode)

Every part is drawn on its own 64x64 layer (facing right, feet on row 58): flat colour, cel shade (lit
from the upper left), dark outline. draw_parts() returns {name: RGBA array}.

  python3 tools/sprites/what_once_was_draw.py [preview.png]
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import hx, capsule, blank, JOINTS

OUT = 0x120e06
PAL = {
    'skin': (0xeedc84, 0xcdb85a, 0x8c7a32),         # wallpaper skin (skins recolour this group)
    'stripe': (0xb8a24a, 0xa48e3c, 0x7a6a2c),       # wallpaper stripes / stains
    'flesh': (0x5a3e2a, 0x3e2a1c, 0x22160e),        # what's under the peeling paper
    'limb': (0xf6ecbc, 0xdccb8c, 0x9c8a50),         # paler, sickly limbs
    'far': (0xa89650, 0x8a7a3c, 0x5a4e24),          # limbs on the far side, in shadow
    'case': (0x77705e, 0x544e40, 0x302c24),         # the TV's plastic case
    'rim': (0x2a2820, 0x1a1914, 0x0e0d0a),          # screen bezel
    'metal': (0xd0d0c8, 0x9a9a92, 0x5e5e58),        # antennae
    'cord': (0x2e2c28, 0x1e1c18, 0x100f0c),
}
SCR = (31, 8, 41, 16)                                # screen rectangle (x1, y1, x2, y2) inside the TV

def finish(img, pal, outline=True):
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

def wallpaper(a, x0, x1, step=3):
    """Faint vertical wallpaper stripes over the skin colour."""
    sk = np.all(a[..., :3] == np.array(hx(PAL['skin'][1]))[:3], -1) | np.all(a[..., :3] == np.array(hx(PAL['skin'][0]))[:3], -1)
    for x in range(x0, x1, step):
        col = a[:, x]
        m = sk[:, x]
        col[m] = hx(PAL['stripe'][0])
    return a

def screen(fill):
    """A layer covering just the screen, painted by fill(a, x, y) for each pixel."""
    a = np.zeros((64, 64, 4), np.uint8)
    x1, y1, x2, y2 = SCR
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            c = fill(x - x1, y - y1)
            if c is not None: a[y, x] = hx(c)
    # the corners of a CRT are rounded: knock them out to the bezel colour
    for (x, y) in ((x1, y1), (x2, y1), (x1, y2), (x2, y2)): a[y, x] = hx(PAL['rim'][1])
    a[y1, x1 + 1] = hx(0xffffff) if a[y1, x1 + 1, 3] else a[y1, x1 + 1]   # glass glint
    return a

def draw_parts():
    P = {}
    S = PAL['skin']
    rng = np.random.default_rng(7)
    # ---------------- the power cord, from the back of the TV down its spine (behind everything)
    im = blank(); d = ImageDraw.Draw(im)
    d.line([(29, 13), (25, 17), (23, 23), (22, 30), (23, 37), (21, 42)], fill=hx(PAL['cord'][1]), width=2)
    a = finish(im, PAL['cord'])
    a[42:45, 20:23] = hx(PAL['metal'][2]); a[44, 20] = hx(PAL['metal'][1]); a[44, 22] = hx(PAL['metal'][1])   # the plug, dangling
    P['cord'] = a
    # ---------------- back leg: thin, bent the wrong way
    im = blank(); d = ImageDraw.Draw(im)
    F = PAL['far']
    capsule(d, JOINTS['bhip'], JOINTS['bknee'], 6, hx(F[1]))
    P['bthigh'] = finish(im, F)
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, (24, 48), (27, 55), 5, hx(F[1]))
    P['bshin'] = finish(im, F)
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(22, 54), (28, 54), (31, 57), (31, 58), (19, 58), (20, 56)], fill=hx(PAL['flesh'][1]))   # a long bare foot
    a = finish(im, PAL['flesh']); put(a, [(30, 58), (28, 58)], OUT)
    P['bshoe'] = a
    # ---------------- front leg: swollen, lumpy
    im = blank(); d = ImageDraw.Draw(im)
    Lm = PAL['limb']
    capsule(d, JOINTS['fhip'], JOINTS['fknee'], 10, hx(Lm[1]))
    a = finish(im, Lm)
    put(a, [(39, 43), (40, 43), (40, 44), (41, 44)], Lm[2])              # a swollen bruise
    P['fthigh'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(37, 47), (45, 47), (44, 55), (39, 55)], fill=hx(Lm[1]))
    a = finish(im, Lm)
    P['fshin'] = a
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(37, 54), (46, 54), (51, 57), (51, 58), (36, 58), (36, 56)], fill=hx(PAL['flesh'][1]))
    a = finish(im, PAL['flesh']); put(a, [(49, 57), (47, 57)], PAL['flesh'][2])   # toes
    P['fshoe'] = a
    # ---------------- back arm: short and withered
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['bshoulder'], JOINTS['belbow'], 5, hx(F[1]))
    P['bupper'] = finish(im, F)
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['belbow'], (26, 37), 4, hx(F[1]))
    a = finish(im, F)
    im2 = blank(); d2 = ImageDraw.Draw(im2)
    for (tx, ty) in ((23, 41), (26, 42), (29, 41)): d2.line([(26, 37), (tx, ty)], fill=hx(PAL['flesh'][1]), width=2)   # claw
    g = finish(im2, PAL['flesh']); m = g[..., 3] > 0; a[m] = g[m]
    P['bfore'] = a
    # ---------------- torso: hunched forward, wallpaper skin, a torn hole showing the dark underneath
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(23, 24), (26, 19), (31, 18), (36, 20), (41, 23), (42, 29), (40, 36), (37, 42), (27, 42), (25, 35), (23, 29)], fill=hx(S[1]))   # hunched, a hump on its back
    a = finish(im, S)
    wallpaper(a, 24, 43)
    for (x, y) in [(28, 33), (29, 33), (29, 34), (30, 34), (30, 35), (31, 34)]: a[y, x] = hx(PAL['flesh'][2])   # the tear
    put(a, [(28, 32), (31, 33), (32, 35), (27, 34), (28, 35)], PAL['flesh'][1])
    put(a, [(27, 31), (32, 32)], S[0])                                      # peeled-back paper edges
    for (x, y) in [(36, 26), (37, 26), (37, 27), (38, 38), (39, 38), (26, 26)]: put(a, [(x, y)], PAL['stripe'][2])   # stains
    for (x, y) in [(25, 22), (24, 25), (24, 28), (24, 31), (25, 34), (26, 37)]: put(a, [(x, y), (x + 1, y)], PAL['stripe'][2])   # the spine, bumping under the paper
    P['torso'] = a
    # ---------------- head: a CRT TV on a stretched neck, antennae on top
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([32, 17, 35, 22], fill=hx(S[1]))                           # the neck, too long and thin
    a = finish(im, S); put(a, [(33, 19), (34, 21)], PAL['flesh'][1])
    im2 = blank(); d2 = ImageDraw.Draw(im2)
    d2.rounded_rectangle([28, 5, 45, 18], radius=2, fill=hx(PAL['case'][1]))   # the TV case, deeper at the back
    d2.rectangle([26, 7, 28, 16], fill=hx(PAL['case'][1]))
    tv = finish(im2, PAL['case'])
    tv[SCR[1] - 1:SCR[3] + 2, SCR[0] - 1:SCR[2] + 2] = hx(PAL['rim'][1])  # bezel
    tv[SCR[1]:SCR[3] + 1, SCR[0]:SCR[2] + 1] = hx(0x161a18)                # a dead screen under the pictures
    tv[17, 43] = hx(0xd84a3a); tv[17, 41] = hx(PAL['metal'][1]); tv[17, 39] = hx(PAL['metal'][1])   # power light, knobs
    for y in range(8, 16, 2): tv[y, 27] = hx(PAL['case'][2])                # vents at the back
    im3 = blank(); d3 = ImageDraw.Draw(im3)
    d3.line([(34, 5), (30, 0)], fill=hx(PAL['metal'][1]), width=1)        # rabbit ears
    d3.line([(38, 5), (44, 0)], fill=hx(PAL['metal'][1]), width=1)
    d3.ellipse([33, 3, 39, 6], fill=hx(PAL['case'][2]))
    ant = np.array(im3); ant[0, 30] = hx(0xffffff); ant[0, 44] = hx(0xffffff)
    for layer in (tv, ant):
        m = layer[..., 3] > 0; a[m] = layer[m]
    P['head'] = a
    # ---------------- the screens (one shown at a time)
    def static_px(x, y):
        v = rng.random()
        return 0xf0f0f0 if v > 0.72 else 0x9a9a9a if v > 0.4 else 0x4a4a4a if v > 0.15 else 0x1a1a1a
    P['scr_static'] = screen(static_px)
    def warn_px(x, y):                                                    # yellow triangle with a black '!' on black
        cx = 5; top = 0; h = 8
        half = (y - top) * 0.62
        inside = y >= top and y <= top + h and abs(x - cx) <= half
        if not inside: return 0x14120c
        if x == cx and (2 <= y <= 5 or y == 7): return 0x14120c
        return 0xffd23a if abs(x - cx) < half - 0.8 or y == top + h else 0xd89a10
    P['scr_warn'] = screen(warn_px)
    def missing_px(x, y):                                                 # a paper poster: red MISSING band, a face, text lines
        if y == 0 or y == 1: return 0xc8281e if 1 <= x <= 9 else 0xe8e2cc
        if y == 8: return 0x5a5448 if 2 <= x <= 8 and x % 2 == 0 else 0xe8e2cc
        if 2 <= y <= 7 and 3 <= x <= 7:
            if y <= 4 and 4 <= x <= 6: return 0x3a342a                   # head
            if y >= 5: return 0x3a342a                                    # shoulders
            return 0xe8e2cc
        return 0xe8e2cc
    P['scr_missing'] = screen(missing_px)
    def eye_px(x, y):                                                     # one huge bloodshot eye staring out
        dx, dy = (x - 5) / 5.5, (y - 4) / 3.6
        r = dx * dx + dy * dy
        if r > 1: return 0x0a0a0a
        if (x - 6) ** 2 + (y - 4) ** 2 <= 2: return 0x0a0a0a if (x, y) != (5, 3) else 0xffffff
        if (x - 6) ** 2 + (y - 4) ** 2 <= 5: return 0x8a6a2a
        return 0xb83a2a if (x + y * 3) % 7 == 0 else 0xf0ece0
    P['scr_eye'] = screen(eye_px)
    def red_px(x, y):                                                     # red static with a white '!'
        if x in (5,) and (1 <= y <= 5 or y == 7): return 0xffffff
        v = rng.random()
        return 0xff4a3a if v > 0.6 else 0xa8140e if v > 0.25 else 0x3a0604
    P['scr_red'] = screen(red_px)
    # ---------------- front arm: far too long, hanging down to a three-fingered claw
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['fshoulder'], JOINTS['felbow'], 6, hx(Lm[1]))
    a = finish(im, Lm)
    P['fupper'] = a
    im = blank(); d = ImageDraw.Draw(im)
    capsule(d, JOINTS['felbow'], (50, 42), 5, hx(Lm[1]))
    a = finish(im, Lm); put(a, [(45, 35), (47, 38)], Lm[2])
    P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im)
    for (tx, ty) in ((48, 51), (52, 52), (56, 48)): d.line([(51, 44), (tx, ty)], fill=hx(PAL['flesh'][1]), width=2)
    d.ellipse([48, 41, 53, 46], fill=hx(PAL['flesh'][1]))
    a = finish(im, PAL['flesh'])
    put(a, [(48, 51), (52, 52), (56, 48), (48, 50), (52, 51), (55, 48)], 0xe8e2cc)   # long pale claw tips
    P['ffist'] = a
    return P

SCREENS = ('scr_static', 'scr_warn', 'scr_missing', 'scr_eye', 'scr_red')
# draw order (back to front) and the rig: name -> (pivot, parent)
ORDER = ['cord', 'bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', *SCREENS, 'fupper', 'ffore', 'ffist']
RIG = {
    'torso': ((32, 39), None),
    'head': ((33, 21), 'torso'), 'cord': ((29, 13), 'head'),
    **{s: ((33, 21), 'head') for s in SCREENS},
    'bupper': ((27, 24), 'torso'), 'bfore': ((25, 31), 'bupper'),
    'fupper': ((38, 24), 'torso'), 'ffore': ((42, 31), 'fupper'), 'ffist': ((50, 43), 'ffore'),
    'bthigh': ((28, 40), None), 'bshin': ((24, 48), 'bthigh'), 'bshoe': ((26, 54), 'bshin'),
    'fthigh': ((36, 40), None), 'fshin': ((40, 48), 'fthigh'), 'fshoe': ((41, 55), 'fshin'),
}
PROPS = ('scr_warn', 'scr_missing', 'scr_eye', 'scr_red')     # hidden unless a pose shows them

def composite(P, hide=PROPS):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = P[n]; m = a[..., 3] > 0
        out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    parts = draw_parts()
    tiles = []
    for scr in SCREENS:
        c = composite(parts, hide=tuple(s for s in SCREENS if s != scr))
        bg = Image.new('RGBA', (64, 64), (60, 56, 40, 255)); bg.alpha_composite(Image.fromarray(c)); tiles.append(bg)
    sheet = Image.new('RGBA', (64 * len(tiles), 64))
    for i, t in enumerate(tiles): sheet.paste(t, (i * 64, 0))
    sheet.resize((sheet.width * 8, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'what_once_was_preview.png')
