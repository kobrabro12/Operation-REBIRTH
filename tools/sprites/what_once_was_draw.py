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
  scr_red      red static with a '!'
Its three MODES (SEE / INCOMING / SMILE) aren't baked in: the game draws an animated mode screen over
this one (mode_screens.png, made here too) using where the screen is in every frame (wowScreens.js).

Costumes with their own drawing - same parts and joints, so every animation fits - pick a STYLE:
  default  stained wallpaper skin, grey CRT, rabbit ears
  aero     FRUTIGER: glossy white glass skin full of aqua bubbles, a translucent blue CRT, leaf-tipped
           antennae, a clear tube for a cord
  hack     ROOT ACCESS: a black hoodie crawling with green code, hood up round a black monitor with a
           green phosphor screen, an LED antenna, a glowing green cable
  dial     DIAL-UP: an old beige home computer - a PC-tower body with drive bays, a floppy slot and
           blinking LEDs, a motherboard showing through its tear, grey ribbon-cable limbs, a beige CRT
           monitor for a head with a ball webcam on top, and a coiled phone cord
  ronin    RONIN: red lacquered armour with gold lacing over indigo hakama, a lacquered TV under a
           kabuto neck guard with a gold crescent crest, a braided red cord
The BODIES its TV can land on after its up special (OUT OF BODY) - human bodies, same joints:
  suit     a man in a black suit, white shirt and red tie
  swat     a SWAT officer: navy tactical gear, a vest with pouches, knee pads, gloves and boots
  doctor   a doctor: white lab coat over blue scrubs, a stethoscope, a pen in the pocket

Every part is drawn on its own 64x64 layer (facing right, feet on row 58): flat colour, cel shade (lit
from the upper left), dark outline. draw_parts() returns {name: RGBA array}.

  python3 tools/sprites/what_once_was_draw.py [preview.png]
"""
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import hx, capsule, blank, JOINTS

OUT = 0x120e06
STYLE = 'default'                                   # set by set_style()
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
STATIC = (0xf0f0f0, 0x9a9a9a, 0x4a4a4a, 0x1a1a1a)    # the static's colours, light to dark
BASE_PAL = dict(PAL)
STYLE_PALS = {
    'aero': {
        'skin': (0xffffff, 0xe2f2fa, 0x96c4da), 'stripe': (0xc8f4ff, 0x9fe6f8, 0x5ac0e0), 'flesh': (0x7ae0f0, 0x2aa8d0, 0x0d6a90),
        'limb': (0xffffff, 0xd4ecf6, 0x88b8d0), 'far': (0xbcdeee, 0x94c4dc, 0x5a8eaa), 'case': (0x9aeaf6, 0x3fb8d8, 0x1a7a9a),
        'rim': (0xffffff, 0xe6f4fb, 0x9ac8dc), 'metal': (0xc8f88a, 0x6fd03a, 0x3a8a1a), 'cord': (0xe8fcff, 0x9ae4f2, 0x4aa8c8)},
    'hack': {
        'skin': (0x3a3a42, 0x26262c, 0x121216), 'stripe': (0x2a3a2e, 0x1e2a22, 0x101810), 'flesh': (0x2e2e32, 0x18181c, 0x08080a),
        'limb': (0x4e4e56, 0x36363c, 0x1c1c20), 'far': (0x2e2e34, 0x222226, 0x101012), 'case': (0x34363c, 0x1e2024, 0x0c0d10),
        'rim': (0x0e0e10, 0x060607, 0x020203), 'metal': (0xb8ffc8, 0x3ae060, 0x157a2e), 'cord': (0x9affb0, 0x2ad050, 0x0e6a2a)},
    'ronin': {
        'skin': (0xf05a48, 0xb82a22, 0x5a1010), 'stripe': (0xc8382c, 0xa02820, 0x5a1010), 'flesh': (0x4a3e44, 0x241c22, 0x0e0a0c),
        'limb': (0x5a6a9c, 0x3a4674, 0x1e2444), 'far': (0x34406a, 0x262e50, 0x141a30), 'case': (0x4a3e44, 0x241c22, 0x0e0a0c),
        'rim': (0xffe08a, 0xd9a32e, 0x8a5e10), 'metal': (0xfff0b0, 0xe8b440, 0x9a6a14), 'cord': (0xf05a48, 0xb82a22, 0x5a1010)},
    'dial': {
        'skin': (0xf2ead2, 0xd8cfb0, 0x9a9278), 'stripe': (0xc8c0a4, 0xbab296, 0x8a8268), 'flesh': (0x5ac05a, 0x1e7a32, 0x0e4a1e),
        'limb': (0xe6e6e2, 0xc0c0bc, 0x808080), 'far': (0xa8a8a4, 0x8a8a86, 0x5a5a58), 'case': (0xf2ead2, 0xd4cba8, 0x8c846a),
        'rim': (0x5a5a5a, 0x3a3a3a, 0x1e1e1e), 'metal': (0xd0d0d0, 0x9a9a9a, 0x5e5e5e), 'cord': (0xececec, 0xb0b0b0, 0x6a6a6a)},
}
STYLE_STATIC = {'dial': (0xffffff, 0x8ab8f0, 0x2a5ad8, 0x0a1a6a), 'aero': (0xffffff, 0x9ff0ff, 0x3fc8ea, 0x1a8ab8), 'hack': (0xb8ffc8, 0x3ae060, 0x157a2e, 0x041808), 'ronin': (0xf4ecd8, 0xb0a490, 0x5a5248, 0x1a1614)}
GOLD = (0xffe08a, 0xd9a32e, 0x8a5e10)
HUMAN = ('suit', 'swat', 'doctor')                 # bodies (no wallpaper skin, no tear)
STYLE_PALS.update({
    'suit': {'skin': (0x3a3a44, 0x24242c, 0x101014), 'stripe': (0x3a3a44, 0x24242c, 0x101014), 'flesh': (0x2a2420, 0x16120e, 0x080604),
             'limb': (0x44444e, 0x2c2c34, 0x14141a), 'far': (0x2a2a32, 0x1c1c22, 0x0c0c10)},
    'swat': {'skin': (0x3a4458, 0x262e40, 0x121624), 'stripe': (0x3a4458, 0x262e40, 0x121624), 'flesh': (0x2e2e30, 0x1a1a1c, 0x0a0a0c),
             'limb': (0x4a4e58, 0x30343c, 0x181a20), 'far': (0x2c3038, 0x1e2228, 0x0e1014)},
    'doctor': {'skin': (0xffffff, 0xe8eef2, 0xa8b4bc), 'stripe': (0xffffff, 0xe8eef2, 0xa8b4bc), 'flesh': (0xf0f4f6, 0xc8d0d6, 0x7a848c),
               'limb': (0x9ad8e8, 0x6ab8d0, 0x3a7a94), 'far': (0x6aa8bc, 0x4a8aa0, 0x2a5a6e)},
})

def set_style(style):
    """Switch every palette to a costume's look (draw_parts() then draws that costume)."""
    global STYLE, STATIC
    STYLE = style
    PAL.clear(); PAL.update(BASE_PAL); PAL.update(STYLE_PALS.get(style, {}))
    STATIC = STYLE_STATIC.get(style, (0xf0f0f0, 0x9a9a9a, 0x4a4a4a, 0x1a1a1a))

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
    if STYLE not in HUMAN: wallpaper(a, 24, 43)
    for (x, y) in ([] if STYLE in HUMAN else [(28, 33), (29, 33), (29, 34), (30, 34), (30, 35), (31, 34)]): a[y, x] = hx(PAL['flesh'][2])   # the tear
    if STYLE not in HUMAN:
        put(a, [(28, 32), (31, 33), (32, 35), (27, 34), (28, 35)], PAL['flesh'][1])
        put(a, [(27, 31), (32, 32)], S[0])                                  # peeled-back paper edges
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
        return STATIC[0] if v > 0.72 else STATIC[1] if v > 0.4 else STATIC[2] if v > 0.15 else STATIC[3]
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
    def smile_px(x, y):                                                   # SMILE: two dot eyes and a wide grin on black
        if y == 2 and x in (2, 3, 7, 8): return 0xffffff
        if y == 5 and 1 <= x <= 9: return 0xffffff
        if y == 6 and 2 <= x <= 8: return 0xffffff if x % 2 else 0x3a3a3a
        if y == 4 and x in (1, 9): return 0xffffff
        return 0x0a0a0a
    P['scr_smile'] = screen(smile_px)
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
    decorate(P)
    if STYLE in HUMAN: decorate_human(P)
    return P

def shine(a, pts, col=0xffffff):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3] and not np.all(a[y, x] == np.array(hx(OUT))): a[y, x] = hx(col)

def decorate(P):
    """The costume-specific details painted over the base parts (the same shapes, so animations still fit)."""
    rng = np.random.default_rng(11)
    if STYLE == 'aero':
        # glossy glass: a white shine streak on every big part, aqua bubbles floating inside the body
        shine(P['torso'], [(27, 22), (27, 23), (26, 24), (26, 25), (26, 26), (28, 21)])
        for (x, y, r) in [(33, 27, 1), (36, 33, 2), (30, 37, 1), (38, 25, 1), (29, 30, 1)]:
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    if abs(dx) + abs(dy) == r or (r == 1 and (dx, dy) == (0, 0)): shine(P['torso'], [(x + dx, y + dy)], 0x7ad8f0)
            shine(P['torso'], [(x - r + 1, y - r + 1)])
        for n in ('fthigh', 'fupper', 'ffore', 'fshin'):
            a = P[n]; ys, xs = np.where(a[..., 3] > 0)
            if len(xs): shine(a, [(int(xs.min()) + 2, int(ys.min()) + 2), (int(xs.min()) + 2, int(ys.min()) + 3)])
        shine(P['head'], [(29, 6), (30, 6), (31, 6), (29, 7)])                          # gloss on the CRT case
        for (x, y) in [(30, 0), (44, 0)]:                                               # leaf tips on the antennae
            for (dx, dy, c) in [(0, 0, 0x6fd03a), (-1, 0, 0xc8f88a), (1, 0, 0x3a8a1a), (0, 1, 0x6fd03a)]:
                if 0 <= x + dx < 64: P['head'][y + dy, x + dx] = hx(c)
        cd = P['cord']; ys, xs = np.where(cd[..., 3] > 0)
        for i in range(0, len(xs), 7): shine(cd, [(int(xs[i]), int(ys[i]))], 0xffffff)   # bubbles in the tube
    elif STYLE == 'hack':
        # green code crawling down the hoodie and the limbs; the hood up round the monitor
        t = P['torso']
        for x in range(25, 42, 3):
            for y in range(20, 42):
                if rng.random() < 0.28: shine(t, [(x, y)], 0x3ae060 if rng.random() < 0.7 else 0xb8ffc8)
        for n in ('fthigh', 'fupper', 'ffore', 'bupper', 'bthigh'):
            a = P[n]; ys, xs = np.where((a[..., 3] > 0) & ~np.all(a == np.array(hx(OUT)), -1))
            for i in range(0, len(xs), 11): shine(a, [(int(xs[i]), int(ys[i]))], 0x3ae060)
        h = P['head']                                                                   # the hood: dark fabric behind and over the monitor
        hood = np.zeros_like(h); im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.pieslice([24, 1, 48, 30], 180, 360, fill=hx(PAL['skin'][1])); d.rectangle([24, 15, 27, 22], fill=hx(PAL['skin'][1]))
        hood = finish(im, PAL['skin'])
        m = (hood[..., 3] > 0) & (h[..., 3] == 0); h[m] = hood[m]
        for (x, y) in [(31, 18), (32, 19), (33, 20), (40, 18), (39, 19)]: shine(h, [(x, y)], 0xb8ffc8)   # drawstrings
        h[17, 43] = hx(0x3ae060)                                                        # green power light
        ff = P['ffist']; ys, xs = np.where(ff[..., 3] > 0)
        for i in range(len(xs)):
            if np.all(ff[ys[i], xs[i]] == np.array(hx(0xe8e2cc))): ff[ys[i], xs[i]] = hx(0x3ae060)   # glowing green fingertips
    elif STYLE == 'dial':
        # a beige PC tower: a 5.25" drive bay, a floppy slot, power button and LEDs, cooling vents
        t = P['torso']
        for x in range(27, 39): shine(t, [(x, 25), (x, 28)], 0x9a9278)
        for x in range(27, 39): shine(t, [(x, 26), (x, 27)], 0xc8bf9e)
        shine(t, [(x, 26) for x in range(29, 37)], 0x3a3a3a)                          # the CD tray seam
        for x in range(28, 38): shine(t, [(x, 30)], 0x9a9278)
        shine(t, [(x, 31) for x in range(30, 36)], 0x1a1a1a)                          # the floppy slot
        shine(t, [(37, 31)], 0x8a8270)                                                  # its eject button
        shine(t, [(36, 35), (37, 35), (36, 36), (37, 36)], 0xb8b096); shine(t, [(36, 35)], 0xffffff)   # power button
        shine(t, [(31, 35)], 0x3ae060); shine(t, [(33, 35)], 0xff9a2a)                 # power and disk LEDs
        for y in range(37, 40): shine(t, [(x, y) for x in range(27, 34, 2)], 0x9a9278)  # vents
        shine(t, [(27, 22), (28, 22), (26, 23)], 0xffffff)
        fl = np.all(t[..., :3] == np.array(hx(PAL['flesh'][2]))[:3], -1)               # the tear: a motherboard with gold traces
        ys, xs = np.where(fl)
        for i in range(len(xs)): t[ys[i], xs[i]] = hx(0xd9a32e if (xs[i] + ys[i]) % 2 else 0x1e7a32)
        for n in ('fupper', 'ffore', 'bupper', 'bfore', 'fthigh', 'bthigh', 'fshin', 'bshin'):   # ribbon-cable stripes on the limbs
            a = P[n]; ys, xs = np.where((a[..., 3] > 0) & ~np.all(a == np.array(hx(OUT)), -1))
            for i in range(len(xs)):
                if xs[i] % 3 == 0: a[ys[i], xs[i]] = hx(0xa0a09c)
        for n in ('bshoe', 'fshoe'):                                                    # feet: chunky grey plastic, like a keyboard's
            a = P[n]
            for src, dst in zip(PAL['flesh'], (0x8a8a86, 0x5a5a58, 0x2e2e2c)):
                m = np.all(a[..., :3] == np.array(hx(src))[:3], -1) & (a[..., 3] > 0); a[m] = hx(dst)
        h = P['head']
        h[0:5, 28:47] = 0                                                               # rabbit ears off...
        im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rectangle([35, 4, 39, 5], fill=hx(0x6a6a6a))                                 # ...a ball webcam on a little stand
        d.ellipse([34, 0, 40, 5], fill=hx(0xd8d8d4))
        cam = finish(im, (0xffffff, 0xd8d8d4, 0x8a8a86))
        cam[2, 37] = hx(0x1a1a1a); cam[2, 38] = hx(0x2a5ad8); cam[1, 38] = hx(0xffffff); cam[3, 36] = hx(0xff2a2a)
        m = cam[..., 3] > 0; h[m] = cam[m]
        shine(h, [(31, 17), (32, 17), (33, 17), (34, 17)], 0x9a9278)                    # the badge under the screen...
        for i, c in enumerate((0xff3a2a, 0x3ae060, 0x2a6ad8, 0xffd23a)): shine(h, [(31 + i, 17)], c)   # ...four little coloured squares
        h[17, 43] = hx(0x3ae060)                                                        # green power light
        shine(h, [(29, 6), (30, 6), (29, 7)])
        ff = P['ffist']; ys, xs = np.where(ff[..., 3] > 0)
        for i in range(len(xs)):
            c = tuple(ff[ys[i], xs[i], :3])
            if c == tuple(hx(0xe8e2cc)[:3]): ff[ys[i], xs[i]] = hx(0xffffff)            # claw tips: white plastic
            elif c in [tuple(hx(v)[:3]) for v in PAL['flesh']]: ff[ys[i], xs[i]] = hx(PAL['limb'][['flesh'].index('flesh') + [tuple(hx(v)[:3]) for v in PAL['flesh']].index(c)])
        cd = P['cord']; ys, xs = np.where(cd[..., 3] > 0)
        for i in range(0, len(xs), 2): shine(cd, [(int(xs[i]), int(ys[i]))], 0x6a6a6a)  # a coiled phone cord
    elif STYLE == 'ronin':
        # lacquered armour plates with gold lacing; a kabuto neck guard and a gold crescent crest
        t = P['torso']
        for y in range(23, 42, 4):
            for x in range(23, 44): shine(t, [(x, y)], 0x1a0808)
            for x in range(25, 42, 4): shine(t, [(x, y + 1)], GOLD[1])
        shine(t, [(27, 22), (28, 22), (29, 22)], 0xf8907a)
        for n in ('fthigh', 'bthigh'):                                                  # armoured thigh plates
            a = P[n]; ys, xs = np.where(a[..., 3] > 0)
            if len(xs):
                y0 = int(ys.min()) + 2
                for y in range(y0, y0 + 6, 2):
                    for x in range(int(xs.min()) + 1, int(xs.max())): shine(a, [(x, y)], 0xb82a22 if y % 4 else 0x5a1010)
        h = P['head']
        im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.polygon([(27, 6), (46, 6), (48, 9), (26, 9)], fill=hx(PAL['case'][1]))       # the helmet bowl over the TV
        d.polygon([(24, 9), (29, 9), (27, 20), (22, 18)], fill=hx(PAL['skin'][1]))    # the neck guard (shikoro) at the back
        lay = finish(im, PAL['case'])
        for y in range(10, 20, 3):
            for x in range(22, 30): shine(lay, [(x, y)], GOLD[1])
        m = lay[..., 3] > 0; h[m] = lay[m]
        h[0:6, 28:47] = 0                                                               # rabbit ears off...
        im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.line([(37, 5), (33, 3), (30, 1), (28, 0)], fill=hx(GOLD[1]), width=2)        # ...a gold crescent crest (maedate) on
        d.line([(37, 5), (41, 3), (44, 1), (46, 0)], fill=hx(GOLD[1]), width=2)
        d.rectangle([35, 4, 39, 6], fill=hx(GOLD[1]))
        cr = finish(im, GOLD); m = cr[..., 3] > 0; h[m] = cr[m]
        ff = P['ffist']; ys, xs = np.where(ff[..., 3] > 0)
        for i in range(len(xs)):
            if np.all(ff[ys[i], xs[i]] == np.array(hx(0xe8e2cc))): ff[ys[i], xs[i]] = hx(GOLD[0])   # gilded claw tips
        cd = P['cord']; ys, xs = np.where(cd[..., 3] > 0)
        for i in range(0, len(xs), 4): shine(cd, [(int(xs[i]), int(ys[i]))], GOLD[1])  # braided with gold

def decorate_human(P):
    """The details that make each body someone: a suit and tie, SWAT gear, a doctor's coat."""
    t = P['torso']
    hand = 0xd8a882                                                                      # bare hands (the claws become fingers)
    if STYLE == 'suit':
        for y in range(20, 30):                                                          # the shirt: a white V under the lapels
            for x in range(33 - (29 - y) // 3, 35 + (29 - y) // 3): shine(t, [(x, y)], 0xf4f4f0)
        for y in range(21, 33): shine(t, [(34, y)], 0xc8281e)                            # the red tie
        shine(t, [(34, 21), (33, 32), (35, 32)], 0x8a1a12)
        for y in range(20, 30): shine(t, [(32 - (29 - y) // 3, y), (36 + (29 - y) // 3, y)], 0x44444e)   # lapels
        for y in (34, 38): shine(t, [(35, y)], 0x101014)                                 # buttons
        shine(t, [(27, 26), (28, 26), (29, 25)], 0xf4f4f0)                               # pocket square
    elif STYLE == 'swat':
        FONT = {'S': ['111', '100', '111', '001', '111'], 'W': ['101', '101', '101', '111', '101'], 'A': ['010', '101', '111', '101', '101'], 'T': ['111', '010', '010', '010', '010']}
        for i, ch in enumerate('SWAT'):                                                  # SWAT across the vest
            for r, row in enumerate(FONT[ch]):
                for c, bit in enumerate(row):
                    if bit == '1': shine(t, [(23 + i * 4 + c, 27 + r)], 0xffffff)
        for x in range(26, 41): shine(t, [(x, 25), (x, 33)], 0x121624)                   # vest panel edges
        for (x, y) in [(28, 35), (29, 35), (33, 35), (34, 35), (37, 35)]: shine(t, [(x, y)], 0x3a4458)   # pouches
        for x in range(25, 42): shine(t, [(x, 38)], 0x0a0a0c)                            # duty belt
        shine(t, [(39, 38), (40, 38)], 0x9a9a92)
        for n in ('fthigh', 'bthigh'):                                                   # knee pads
            a = P[n]; ys, xs = np.where(a[..., 3] > 0)
            if len(xs):
                y = int(ys.max()) - 2
                for x in range(int(xs.min()) + 1, int(xs.max())): shine(a, [(x, y), (x, y - 1)], 0x1a1a1c)
    elif STYLE == 'doctor':
        for y in range(21, 41): shine(t, [(37, y)], 0xa8b4bc)                            # the coat's front edge
        for y in range(21, 27): shine(t, [(38 + (y - 21) // 2, y)], 0xc8d0d6)            # lapel
        for (x, y) in [(33, 20), (32, 22), (32, 25), (33, 28), (35, 30), (37, 29), (38, 27)]: shine(t, [(x, y)], 0x2a2a2a)   # stethoscope
        shine(t, [(36, 31), (37, 31), (36, 32), (37, 32)], 0x9a9a92)
        shine(t, [(40, 27), (40, 28), (40, 29)], 0x2a5ac8)                               # a pen in the pocket
        for x in range(38, 42): shine(t, [(x, 30)], 0xa8b4bc)
        for (x, y) in [(28, 24), (27, 25), (28, 25), (29, 25), (28, 26)]: shine(t, [(x, y)], 0xd02a2a)   # a red cross badge
    for n in ('ffist', 'bfore'):                                                         # claws become fingers (in gloves for SWAT)
        a = P[n]; ys, xs = np.where(a[..., 3] > 0)
        for i in range(len(xs)):
            c = a[ys[i], xs[i]]
            if np.all(c == np.array(hx(0xe8e2cc))) or np.all(c == np.array(hx(PAL['flesh'][1]))) or np.all(c == np.array(hx(PAL['flesh'][0]))):
                a[ys[i], xs[i]] = hx(0x1a1a1c if STYLE == 'swat' else hand)
    for n in ('bshoe', 'fshoe'):                                                         # shoes / boots with a shine
        a = P[n]; ys, xs = np.where((a[..., 3] > 0) & ~np.all(a == np.array(hx(OUT)), -1))
        if len(xs): shine(a, [(int(xs.min()) + 2, int(ys.min()))], 0xffffff if STYLE != 'doctor' else 0x9ab0ba)

# ---------------------------------------------------------------- the animated MODE screens (drawn by the game)
MODE_W, MODE_H = 11, 9
def mode_screens(style):
    """4 frames each of SEE (the eye looks about and blinks), INCOMING (bright red, flashing '!') and SMILE (a
    grin that glitches), in this costume's colours. Returns 12 RGBA frames of 11x9."""
    iris = {'aero': 0x3fc8ea, 'hack': 0x3ae060, 'ronin': 0xd9a32e, 'dial': 0x2a5ad8}.get(style, 0x8a6a2a)
    white = {'hack': 0x9affb0}.get(style, 0xf0ece0)
    red = {'aero': (0xff6a7a, 0xffc0c8), 'hack': (0xff3a2a, 0xffa090), 'ronin': (0xe02a1a, 0xffd060)}.get(style, (0xff2a1a, 0xffb0a0))
    grin = {'aero': 0xffffff, 'hack': 0x3ae060, 'ronin': 0xffe08a, 'dial': 0xffffff}.get(style, 0xffffff)
    bg = {'aero': 0x0d3550, 'hack': 0x020a04, 'ronin': 0x140a06, 'dial': 0x0a2484}.get(style, 0x0a0a0a)
    frames = []
    def frame(fn):
        a = np.zeros((MODE_H, MODE_W, 4), np.uint8)
        for y in range(MODE_H):
            for x in range(MODE_W): a[y, x] = hx(fn(x, y))
        for (x, y) in ((0, 0), (MODE_W - 1, 0), (0, MODE_H - 1), (MODE_W - 1, MODE_H - 1)): a[y, x] = 0
        return a
    for look, lid in ((0, 0), (-2, 0), (2, 0), (0, 1)):                           # SEE
        def eye(x, y, look=look, lid=lid):
            dx, dy = (x - 5) / 5.5, (y - 4) / 3.8
            if dx * dx + dy * dy > 1: return bg
            if lid: return 0x3a342a if y != 4 else 0x1a1814                       # blink
            px = 5 + look
            if (x - px) ** 2 + (y - 4) ** 2 <= 1: return 0x050505
            if (x - px) ** 2 + (y - 4) ** 2 <= 4: return iris
            if (x, y) == (px - 1, 3): return 0xffffff
            return 0xb83a2a if (x * 7 + y * 3) % 11 == 0 else white
        frames.append(frame(eye))
    for k in range(4):                                                             # INCOMING
        def inc(x, y, k=k):
            if x == 5 and (1 <= y <= 5 or y == 7) and k % 2 == 0: return 0xffffff
            lit = (y + k) % 3 != 0
            return red[1] if (k == 1 and lit and (x + y) % 4 == 0) else red[0] if lit else 0xa8140e
        frames.append(frame(inc))
    for k in range(4):                                                             # SMILE
        def sm(x, y, k=k):
            sx = x + (1 if (k == 3 and y in (5, 6)) else 0)                           # one frame tears sideways
            if y == 2 and sx in (2, 3, 7, 8) and not (k == 2 and sx in (7, 8)): return grin   # (a wink)
            if k == 2 and y == 3 and sx in (7, 8): return grin
            if y == 5 and 1 <= sx <= 9: return grin
            if y == 6 and 2 <= sx <= 8: return grin if sx % 2 else 0x3a3a3a
            if y == 4 and sx in (1, 9): return grin
            if y == 7 and 3 <= sx <= 7 and k == 1: return 0xc8281e                 # a sliver of red
            return bg
        frames.append(frame(sm))
    return frames

SCREENS = ('scr_static', 'scr_warn', 'scr_missing', 'scr_eye', 'scr_red', 'scr_smile')
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
PROPS = ('scr_warn', 'scr_missing', 'scr_eye', 'scr_red', 'scr_smile')     # hidden unless a pose shows them

def composite(P, hide=PROPS):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = P[n]; m = a[..., 3] > 0
        out[m] = a[m]
    return out

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 2: set_style(sys.argv[2])
    parts = draw_parts()
    tiles = []
    for scr in SCREENS:
        c = composite(parts, hide=tuple(s for s in SCREENS if s != scr))
        bg = Image.new('RGBA', (64, 64), (60, 56, 40, 255)); bg.alpha_composite(Image.fromarray(c)); tiles.append(bg)
    sheet = Image.new('RGBA', (64 * len(tiles), 64))
    for i, t in enumerate(tiles): sheet.paste(t, (i * 64, 0))
    sheet.resize((sheet.width * 8, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'what_once_was_preview.png')
