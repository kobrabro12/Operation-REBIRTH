"""THE DEVOTED (WIP test fighter) - a quiet, pale man with a kitchen knife who prays to a symbol, and a black
sludge that takes a little more of her every time she does. Four looks, one per sludge stage:

  DEFAULT  clean: long ashy-blond hair, a striped mustard shirt, dark trousers, a karambit, a faint smile
  SEMI     sludge drips from her hair down her face and shoulders; the smile widens
  TAKEN    most of her is covered; a wide toothy grin
  DROWNED  she's all sludge but her eyes and a huge grin - and one giant demon wing grows from her back

Built on AERO's skeleton (tools/sprites/aero_moves.py: the same parts and the same moves, minus FULL AERO's
spear moves); her move table is src/fighters/dvMoves.js (generated here). The karambit is drawn into her front fist; the scarf slot is the demon wing (DROWNED) or a sludge strand.

  python3 tools/sprites/devoted_draw.py [--preview FILE]
  -> public/assets/fighters/devoted/ (DEFAULT) and devoted/semi/, devoted/taken/, devoted/drowned/
"""
import os, sys, math, shutil, types
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import aero_draw as D
import aero_moves as A

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/fighters/devoted')
STAGES = ['default', 'semi', 'taken', 'drowned']

def hx(c): return np.array([c >> 16 & 255, c >> 8 & 255, c & 255, 255], np.uint8)
LINE = 0x1a1418
SHIRT = [0x6e5e24, 0x96823a, 0xbca452, 0xd8c47a]       # a faded mustard long-sleeved shirt, shadow -> light
STRIPE = [0x3a2c18, 0x4e3c20, 0x5e4a28, 0x6e5830]      # its dark brown stripes
PANTS = [0x22222a, 0x2e2e38, 0x3c3c48, 0x4a4a58]
SHOE = [0x141216, 0x1e1c22, 0x2a2830, 0x36343c]
SKIN = [0xa88e7e, 0xc8ad9c, 0xe0c8b6, 0xf0dccc]
HAIR = [0x7a6c50, 0x9e8e68, 0xc2b48a, 0xddd2a8]       # long, straight, ashy-blond hair
SLUDGE = [0x060508, 0x0e0c12, 0x1a1720, 0x2e2a38]     # black sludge, with an oily sheen
SHEEN = 0x4a4458
# MAD MURDER (costume, `--set murder`): a grimy white shirt soaked in blood, and a smiling mask with a crack
# through it, one wild eye staring out of the crack
VARIANT = ''
MURDER_SHIRT = [0x7e786c, 0x9c9688, 0xbab4a4, 0xd4cfc0]
BLOOD = [0x3a0608, 0x5e0c10, 0x861418, 0xa8201e]
MASK = [0xb8b0a0, 0xd0c8b8, 0xe4ddce, 0xf4efe4]

def bloody(x, y, seed, heavy=0.0):
    """Is this pixel splashed with blood? (MAD MURDER) - spatters, plus heavier soaking lower down."""
    return blob(x, y, seed + 21) + heavy * (y / 64) > 0.78 or noise(x, y, seed + 22) > 0.95

# how much of her the sludge covers at each stage (0 = none, 1 = all of her)
COVER = [0.0, 0.34, 0.6, 1.0]
# which parts are what (the shading ramp they get)
KIND = {'torso': SHIRT, 'bupper': SHIRT, 'fupper': SHIRT, 'bfore': SHIRT, 'ffore': SHIRT, 'bfist': SKIN, 'ffist': SKIN,
        'bthigh': PANTS, 'fthigh': PANTS, 'bshin': PANTS, 'fshin': PANTS, 'bshoe': SHOE, 'fshoe': SHOE}

def sh(m, dy, dx):
    H, W = m.shape; o = np.zeros_like(m)
    o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return o

def outline(a):
    s = a[..., 3] > 0
    ring = ~s & (sh(s, 1, 0) | sh(s, -1, 0) | sh(s, 0, 1) | sh(s, 0, -1))
    a[ring] = hx(LINE); return a

def noise(x, y, seed=0):
    """Smooth-ish hash noise in 0..1 (no randomness between runs)."""
    v = math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
    return v - math.floor(v)

def blob(x, y, seed=0):
    """Low-frequency noise: the sludge's uneven edge."""
    return (noise(x // 3, y // 3, seed) * 0.6 + noise(x // 2, y // 2, seed + 9) * 0.4)

def sludged(x, y, stage, seed=0):
    """Is this pixel under sludge? It pours down from the top of her head, unevenly, in runs and drips."""
    c = COVER[stage]
    if c <= 0: return False
    if c >= 1: return True
    run = noise(x, 0, seed + 3)                      # some columns run further down (drips)
    reach = 4 + c * 60 + (run - 0.5) * 20 * c        # how far down from the top of the head it has run, in pixels
    return y + (blob(x, y, seed) - 0.5) * 10 < reach

def repaint(a, ramp, stage, seed):
    """One of AERO's body parts as THE DEVOTED's clothes, with the sludge over it."""
    a = a.copy(); s = a[..., 3] > 0
    line = s & np.all(a[..., :3] == hx(D.OUT)[:3], -1); fill = s & ~line
    lum = a[..., :3].astype(float).mean(-1) / 255
    if fill.any():
        lo, hi = np.percentile(lum[fill], 5), np.percentile(lum[fill], 95)
        v = np.clip((lum - lo) / max(1e-3, hi - lo), 0, 1)
    for y, x in zip(*np.nonzero(fill)):
        if sludged(x, y, stage, seed):
            k = 3 if noise(x, y, seed + 5) > 0.93 else int(v[y, x] * 2.99)
            a[y, x] = hx(SLUDGE[k])
        elif VARIANT == 'murder' and ramp in (SHIRT, SKIN, PANTS) and bloody(x, y, seed, 0.5 if ramp is SHIRT else 0.2):
            a[y, x] = hx(BLOOD[min(3, int(v[y, x] * 3.99))])
        else:
            if VARIANT == 'murder' and ramp is SHIRT: r = MURDER_SHIRT
            else: r = STRIPE if ramp is SHIRT and y % 4 == 1 else ramp          # (the shirt's stripes)
            a[y, x] = hx(r[min(len(r) - 1, int(v[y, x] * (len(r) - 0.01)))])
    a[line] = hx(LINE)
    if stage:                                                          # drips hanging off the sludge's lower edge
        H = a.shape[0]
        for x in range(64):
            col = [y for y in range(H) if a[y, x, 3] and np.all(a[y, x, :3] == hx(SLUDGE[0])[:3]) or (a[y, x, 3] and tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in SLUDGE])]
            if col and noise(x, 7, seed) < 0.18 * stage:
                y0 = max(col)
                for d in range(1, 2 + int(noise(x, 3, seed) * 3)):
                    if y0 + d < H and a[y0 + d, x, 3] == 0: a[y0 + d, x] = hx(SLUDGE[1])
    return outline(a) if stage else a

def head(stage):
    """Her head, facing right: messy dark hair, two dark eyes, and a smile that grows with every stage."""
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    d.ellipse([26, 6, 41, 22], fill=(255, 255, 255, 255))
    h = np.zeros((64, 64, 4), np.uint8); s = np.array(im)[..., 3] > 0
    yy, xx = np.mgrid[0:64, 0:64]
    for y, x in zip(*np.nonzero(s)):
        v = 1 - min(1, math.hypot(x - 37, y - 10) / 13)
        h[y, x] = hx(SKIN[min(3, int(v * 3.99))])
    # hair: long and straight - a fringe across her forehead, a lock over her front eye's brow, and a curtain down
    # the back of her head past her neck
    im2 = Image.new('RGBA', (64, 64)); d2 = ImageDraw.Draw(im2)
    d2.ellipse([25, 4, 42, 13], fill=(255, 255, 255, 255))                     # the crown (kept above her eyes)
    d2.rectangle([31, 11, 43, 14], fill=(0, 0, 0, 0))
    d2.polygon([(25, 9), (31, 9), (31, 26), (28, 28), (24, 25)], fill=(255, 255, 255, 255))   # down the back
    d2.polygon([(33, 8), (42, 8), (42, 10), (34, 10)], fill=(255, 255, 255, 255))   # the fringe, ending above her brows
    hm = np.array(im2)[..., 3] > 0
    for y, x in zip(*np.nonzero(hm)):
        k = 3 if (y < 8 and x > 30) else 2 if (x + y * 0) % 3 else 1     # light on top, strands down the back
        if x < 27 or y > 20: k = max(0, k - 1)
        h[y, x] = hx(HAIR[k])
    for x in range(25, 31):                                                  # the uneven ends
        if noise(x, 2, 7) < 0.5: h[27 + int(noise(x, 4, 7) * 2), x] = hx(HAIR[0])
    a = h
    # the sludge (from stage 1 on it pours down from her hair; DROWNED: all of her)
    hair = np.zeros((64, 64), bool)
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        if tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in HAIR]: hair[y, x] = True
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        if stage == 1:                    # SEMI: the top of her hair is soaked, and it runs down her hair and face in streaks
            on = (hair[y, x] and (y < 9 + noise(x, 0, 12) * 4 or noise(x, 1, 12) < 0.3)) or (x in (34, 37, 41) and y < 11 + noise(x, 0, 5) * 8)
        elif stage == 2:                  # TAKEN: all of her head but a patch of face round the eyes and the grin
            on = ((x - 37) / 5.5) ** 2 + ((y - 15) / 4.5) ** 2 > 1 + (noise(x, y, 3) - 0.5) * 0.5
        else: on = stage == 3
        if on: a[y, x] = hx(SLUDGE[3 if noise(x, y, 8) > 0.9 else 1 + int(noise(x, y, 9) * 1.99)])
    # the face: eyes, then the smile (drawn over the sludge - it never covers those)
    # eyes: big enough to read at game size - a white, a dark 2x2 iris looking forward (glowing sludge-violet the
    # further gone she is) with a bright glint, and a dark lash line on top. DROWNED: two staring white lights.
    iris = [0x14100e, 0x3a1450, 0x6a1a8a, 0xf4f0e8][stage]
    for x0 in (34, 38):
        a[11, x0:x0 + 3] = hx(0x0e0a0a)                                    # the lash line
        for y in (12, 13):
            a[y, x0] = hx(0xf4f0e8 if stage < 3 else 0x2a1a30)            # the white (DROWNED: dark round the light)
            a[y, x0 + 1] = hx(iris); a[y, x0 + 2] = hx(iris)
        a[12, x0 + 2] = hx(0xffffff if stage < 3 else 0xffffff)            # the glint
        if stage == 3: a[13, x0 + 1] = hx(0xc8c0ff)
    if stage >= 2:                                            # dark hollows under the eyes
        for x in range(34, 41):
            if a[14, x, 3] and stage < 3: a[14, x] = hx(0x6a4a44)
    smile = {0: [(36, 17), (37, 17), (38, 17)],
             1: [(35, 16), (36, 17), (37, 17), (38, 17), (39, 16)],
             2: [(33, 15), (34, 16), (35, 17), (36, 17), (37, 17), (38, 17), (39, 17), (40, 16)],
             3: [(31, 14), (32, 15), (33, 16), (34, 17), (35, 18), (36, 18), (37, 18), (38, 18), (39, 18), (40, 17), (41, 16)]}[stage]
    mouth = 0x3a1414 if stage < 3 else 0xffffff
    for x, y in smile: a[y, x] = hx(mouth)
    if stage >= 2:                                            # teeth: a row of white in the grin
        teeth = [(x, y - 1) for x, y in smile[1:-1]]
        for x, y in teeth: a[y, x] = hx(0xf8f4ec)
        if stage == 3:
            for x, y in smile[2:-2]: a[y + 1, x] = hx(0xd8d4cc)
    if VARIANT == 'murder': a = mask(a, stage)
    a = outline(a)
    a[22, 31:36] = np.where(a[22, 31:36, 3:4] > 0, a[22, 31:36], hx(LINE))   # (neck shadow)
    return a

def mask(a, stage):
    """MAD MURDER's mask over her face: a pale smiling face (shut, happy eyes and a wide painted grin) splashed with
    blood, a crack running down through it, and in the crack one wild, bloodshot eye staring out."""
    im = Image.new('RGBA', (64, 64)); ImageDraw.Draw(im).ellipse([31, 7, 43, 21], fill=(255, 255, 255, 255))
    m = np.array(im)[..., 3] > 0
    for y, x in zip(*np.nonzero(m)):
        v = 1 - min(1, math.hypot(x - 39, y - 11) / 10)
        a[y, x] = hx(MASK[min(3, int(v * 3.99))])
        pass
    for x, y in [(42, 9), (43, 10), (42, 10), (34, 19), (35, 20), (41, 19), (32, 14)]:          # a few splashes of blood on it
        if m[y, x]: a[y, x] = hx(BLOOD[2])
    for x, y in [(33, 12), (34, 11), (35, 12)]: a[y, x] = hx(0x1a1418)                     # a shut, happy eye (^)
    smile = [(33, 16), (34, 17), (35, 18), (36, 18), (37, 18), (38, 18), (39, 18), (40, 17), (41, 16), (42, 15)]
    for x, y in smile: a[y, x] = hx(0x1a1418)                                            # the painted grin...
    for x, y in smile[2:-2]: a[y - 1, x] = hx(0x8e1a1e)                                  # ...its red lips
    crack = [(41, 7), (40, 8), (40, 9), (39, 10), (39, 11), (40, 12), (39, 13), (38, 14), (38, 15), (37, 16)]
    for x, y in crack: a[y, x] = hx(0x0e0c12)                                            # the crack
    # the eye in the crack: a dark hole torn round it, bloodshot white, a tiny pupil, red veins
    for x in range(37, 42):
        for y in range(9, 15): a[y, x] = hx(0x0e0c12)
    for x, y in [(38, 11), (40, 11), (38, 12), (40, 12), (39, 11), (39, 12), (39, 10), (39, 13)]: a[y, x] = hx(0xf8f0e8)
    a[11, 38] = hx(0xc83030); a[12, 40] = hx(0xc83030)
    a[11, 39] = hx(0x000000); a[12, 39] = hx(0x6a0c10)
    if stage >= 2: a[11, 40] = hx(0xff3030)                                              # (redder the further gone she is)
    for y in range(17, 20 + stage):                                                       # blood running off the chin
        if a[y, 36, 3]: a[y, 36] = hx(BLOOD[2])
    return a

def knife(a):
    a = _knife(a)
    if VARIANT == 'murder':                                   # MAD MURDER: the blade's red
        for y, x in zip(*np.nonzero(a[..., 3] > 0)):
            r, g, b = a[y, x, :3]
            if r > 150 and g > 150 and noise(x, y, 50) > 0.35: a[y, x] = hx(BLOOD[3] if noise(x, y, 51) > 0.5 else BLOOD[2])
    return a

def _knife(a):
    """A karambit in her front fist: a black claw-curved blade hooking forward and down out of the bottom of her fist,
    a silver edge along its inside curve, the black grip in her hand and the finger ring sticking out behind it."""
    a = a.copy()
    for x, y in [(43, 26), (44, 26), (45, 26)]: a[y, x] = hx(0x16161c)        # the black grip, showing through her fingers
    for x, y in [(42, 19), (43, 18), (44, 18), (45, 19), (45, 20), (44, 21), (43, 21), (42, 20)]:   # the finger ring, over her fist
        a[y, x] = hx(0x4a4a56 if y < 20 else 0x16161c)
    for x, y in [(41, 19), (41, 20), (42, 17), (43, 17), (44, 17), (45, 17), (46, 19), (46, 20), (42, 21), (45, 21)]:
        if not a[y, x, 3]: a[y, x] = hx(LINE)
    for x, y in [(43, 22), (44, 22)]:
        if not a[y, x, 3]: a[y, x] = hx(0x16161c)
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    outer = [(46, 26), (49, 26), (52, 27), (54, 30), (55, 33), (54, 36), (52, 39)]           # the spine: a claw's curve
    inner = [(52, 36), (52, 33), (51, 31), (49, 29), (47, 29)]                               # the cutting edge, inside the curve
    d.polygon(outer + inner, fill=(255, 255, 255, 255))
    m = np.array(im)[..., 3] > 0
    for y, x in zip(*np.nonzero(m)):
        if a[y, x, 3] and x <= 46: continue                                                # (her fingers stay in front)
        spine = not m[y - 1, x] or not m[y, min(63, x + 1)]
        a[y, x] = hx(0x3a3a46 if spine else 0x16161c)                                      # black, with a dull sheen on the spine
    for x, y in [(48, 29), (49, 29), (50, 30), (51, 31), (51, 32), (52, 33), (51, 34), (52, 35), (52, 36), (52, 37)]:
        if m[y, x]: a[y, x] = hx(0xd8dce4)                                                 # the bright silver edge
    a[39, 52] = hx(0xf4f6fa)                                                                 # the point
    s = a[..., 3] > 0
    ring = ~s & (sh(s, 1, 0) | sh(s, -1, 0) | sh(s, 0, 1) | sh(s, 0, -1))
    ring[:, :46] = False; ring[:26, :] = False
    a[ring] = hx(LINE)
    return a

def wing(stage):
    """The scarf slot: a single giant demon wing (DROWNED), a strand of sludge (TAKEN / SEMI), nothing (DEFAULT)."""
    a = np.zeros((64, 64, 4), np.uint8)
    if stage == 3:
        im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
        root = (29, 23)
        tips = [(2, 0), (0, 14), (3, 28), (10, 38)]                        # the bony fingers reach up and back
        d.polygon([root, (24, 4), (12, 0), tips[0], (5, 8), tips[1], (6, 22), tips[2], (13, 30), tips[3], (22, 33)], fill=(255, 255, 255, 255))
        m = np.array(im)[..., 3] > 0
        for y, x in zip(*np.nonzero(m)):
            a[y, x] = hx(0x1a0e1e if noise(x, y, 2) > 0.2 else 0x2a1630)
        for t in tips + [(12, 0)]:                                          # the bones
            bi = Image.new('RGBA', (64, 64)); ImageDraw.Draw(bi).line([root, t], fill=(255, 255, 255, 255), width=1)
            for y, x in zip(*np.nonzero(np.array(bi)[..., 3] > 0)): a[y, x] = hx(0x4a3248)
        for t in tips: a[t[1], t[0]] = hx(0xc8b8c0)                          # claws at the tips
        for y in range(1, 4): a[y, 12] = hx(0xc8b8c0)
        # sludge running off the wing's lower edge
        for x in range(8, 28, 3):
            col = [y for y in range(64) if a[y, x, 3]]
            if col:
                for d2 in range(1, 3): a[max(col) + d2, x] = hx(SLUDGE[1])
        return outline(a)
    if stage >= 1:                                                         # a sludge strand down her back
        n = 4 + stage * 4
        for i in range(n):
            x, y = 28 - i // 3, 22 + i
            a[y, x] = hx(SLUDGE[1]); a[y, x - 1] = hx(SLUDGE[0])
        return outline(a)
    a[24, 29] = hx(SHIRT[1])                                               # (hidden behind her back)
    return a

def draw_parts(stage):
    base = D.draw_parts()
    P = {}
    for n, l in base.items():
        if n in ('head', 'fish', 'scarf'): continue
        P[n] = repaint(l, KIND.get(n, SHIRT), stage, hash(n) % 97)
    P['ffist'] = knife(P['ffist'])
    P['head'] = head(stage)
    f = np.zeros((64, 64, 4), np.uint8); f[16, 33] = P['head'][16, 33] if P['head'][16, 33, 3] else hx(SKIN[2])   # (the goldfish slot: a still pixel of her cheek)
    P['fish'] = f
    P['scarf'] = wing(stage)
    return P

ORDER = D.ORDER
# AERO's moves without FULL AERO's spear moves (k_*, upb_king) - she never uses them, and they'd push the moves
# sheet past the 4096 px phones can load. Its own frame table: src/fighters/dvMoves.js
MOVES = {k: v for k, v in A.MOVES.items() if not k.startswith('k_') and k != 'upb_king'}
JS = os.path.join(ROOT, 'src/fighters/dvMoves.js')

# WORSHIP (her PRAY, down special - replaces AERO's downB): she drops to one knee, raises the karambit high over her
# head, then drives it down into the ground in front of her and holds it there, head bowed,
# before getting up. The stab lands on frame 22 (the sludge rises from there; an answered prayer takes her up at 32).
P, k, mix = A.P, A.k, A.mix
KNEEL = P(root=(0, 2, 0, 1.0, 0.84), torso=(6, 0, 1), head=(10, 0, 1),
          bthigh=(64, 0, 0), bshin=(-120, 0, 0), bshoe=(56, 0, 0), fthigh=(-62, 0, 0), fshin=(62, 0, 0), fshoe=(0, 0, 0),
          fupper=(20, 0, 0), ffore=(-40, 0, 0), bupper=(20, 0, 0), bfore=(-30, 0, 0))
RAISE = mix(KNEEL, torso=(-6, 0, 0), head=(-4, 0, 0), fupper=(-142, 0, -2), ffore=(-36, 0, 0), bupper=(10, 0, 0), bfore=(-50, 0, 0))
STAB = mix(KNEEL, root=(0, 3, 2, 1.0, 0.82), torso=(18, 1, 2), head=(22, 0, 2), fupper=(48, 0, 1), ffore=(36, 0, 0), bupper=(4, 0, 0), bfore=(-40, 0, 0))
# OFFERING (neutral special): draws the karambit across her open palm, then flings the sludge that pours out of it
CUT = P(torso=(8, 0, 1), head=(14, 0, 1), fupper=(-30, 0, 0), ffore=(-100, 0, 0), bupper=(-50, 0, 0), bfore=(-60, 0, 0), **A.legs(12, -6, -14, 10))
FLING = P(torso=(-10, 1, -1), head=(-8, 0, 0), fupper=(30, 0, 0), ffore=(-30, 0, 0), bupper=(-120, 0, -1), bfore=(-20, 0, 0), root=(0, 2, -1, 0.96, 1.04), **A.legs(20, -2, -24, 14))
MOVES['neutralB'] = (32, [k(0, P()), k(7, CUT, 'out'), k(11, mix(CUT, ffore=(-70, 0, 0)), 'snap'), k(14, FLING, 'snap'), k(22, mix(FLING, bupper=(-100, 0, -1)), 'out'), k(32, P(), 'back')], 1, ('bfore',), False, None)
# REAPING HOOK (side special): a low lunge, the karambit swung round in a hooking arc that drags them past her
COIL = P(torso=(22, 0, 2), head=(18, 0, 2), fupper=(50, 0, 0), ffore=(-40, 0, 0), bupper=(10, 0, 0), bfore=(-50, 0, 0), root=(0, -2, 0, 1.06, 0.9), **A.legs(30, -40, -30, 40))
REACH = P(torso=(30, 2, 3), head=(20, 0, 2), fupper=(-80, 0, -1), ffore=(-10, 0, 0), bupper=(40, 0, 0), bfore=(-30, 0, 0), root=(0, 4, 2, 1.06, 0.9), **A.legs(36, -20, -44, 30))
HOOK = mix(REACH, fupper=(-10, 0, 0), ffore=(-90, 0, 0), torso=(16, 0, 1))
MOVES['sideB'] = (34, [k(0, P()), k(4, COIL, 'out'), k(8, REACH, 'snap'), k(13, HOOK, 'snap'), k(24, mix(HOOK, torso=(10, 0, 1)), 'out'), k(34, P(), 'back')], 1, ('ffore', 'ffist'), False, None)
# SLUDGE GEYSER (up special): stabs straight down at her own feet - the geyser of sludge throws her up, karambit high
DOWNSTAB = P(torso=(20, 0, 2), head=(24, 0, 2), fupper=(40, 0, 0), ffore=(40, 0, 0), bupper=(20, 0, 0), bfore=(-20, 0, 0), **A.DEEP)
UPTHRUST = P(torso=(-10, 0, -1), head=(-14, 0, 0), fupper=(-165, 0, -2), ffore=(-10, 0, 0), bupper=(-30, 0, 0), bfore=(-40, 0, 0), root=(0, 0, -3, 0.9, 1.12), **A.legs(-10, 30, -20, 40, -10, -10))
MOVES['upb'] = (40, [k(0, P()), k(6, DOWNSTAB, 'out'), k(10, UPTHRUST, 'snap'), k(28, mix(UPTHRUST, fupper=(-150, 0, -2)), 'linear'), k(40, mix(UPTHRUST, **A.legs(-20, 50, -30, 60)), 'out')], 1, ('ffore', 'ffist'), False, None)
MOVES['downB'] = (54, [k(0, P()), k(8, KNEEL, 'out'), k(16, RAISE, 'inout'), k(22, STAB, 'snap'),
                       k(30, mix(STAB, torso=(30, 1, 2)), 'linear'), k(44, mix(STAB, head=(36, 0, 2)), 'linear'), k(54, P(), 'back')],
                  1, (), False, None)
FOLLOW = dict(A.FOLLOW, fish=(0, 0), scarf=(0.5, 1.0))

def idle_keys():
    """Her own idle: hunched, head hung, the karambit spinning round her finger on its ring (two quick flicks), then
    her head slowly sinks and lolls forward... holds... and twitches back. 192 ticks."""
    keys = []
    for i in range(0, 193, 6):
        flip = 0
        for t0 in (18, 48):                                           # two quick flicks of the blade on its ring
            if t0 <= i <= t0 + 18: flip = -70 * math.sin((i - t0) / 18 * math.pi)
        tilt = 0.0                                                    # 0 -> 1: the slow head tilt, snapped back at 168
        if 96 <= i < 132: tilt = (i - 96) / 36
        elif 132 <= i < 168: tilt = 1
        twitch = 1 if i == 168 else 0
        sway = math.sin(i * math.pi / 96)
        keys.append(k(i, P(root=(0, 0, 1, 1.0, 0.98), torso=(10 + 2 * sway, 0, 1), head=(12 + 24 * tilt - 14 * twitch, 0, 1 + tilt),
                           fupper=(18 + 4 * sway, 0, 0), ffore=(-38 + flip * 0.3, 0, 0), ffist=(flip, 0, 0),
                           bupper=(6, 0, 0), bfore=(-6, 0, 0), **A.legs(10, -10, -12, 14)), 'linear'))
    return keys

def make_life(stage):
    """AERO's breathing, minus the goldfish; DROWNED's wing beats slowly and heavily."""
    def life(pose, t):
        p = A.life(pose, t)
        p['fish'] = (0, 0, 0, 1, 1)
        sc = A.N.full(p.get('scarf'))
        if stage == 3: sc[0] += -8 * math.sin(t * 0.09) - 2 * math.sin(t * 0.21)
        else: sc[0] *= 0.3
        p['scarf'] = tuple(sc)
        return p
    return life

def composite(layers, hide=()):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = layers[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    if '--set' in sys.argv:                                          # a costume's look: --set murder
        i = sys.argv.index('--set'); VARIANT = sys.argv[i + 1]; del sys.argv[i:i + 2]
    if '--move' in sys.argv:                                         # a contact sheet of one move: --move NAME FILE
        sys.argv[sys.argv.index('--move'):sys.argv.index('--move') + 1] = []
    if '--pray' in sys.argv or len(sys.argv) == 3:
        layers = draw_parts(0)
        look = types.SimpleNamespace(draw_parts=lambda L=layers: {n: a.copy() for n, a in L.items()}, composite=composite, ORDER=ORDER, RIG=D.RIG)
        small, big = A.N.build_rig(look, FOLLOW)
        name = sys.argv[1] if len(sys.argv) == 3 else 'downB'
        t, keys, step, smear, loop, center = MOVES[name]
        fr = A.N.animate(big, keys, t, step=step, smear=smear, center=center, life=make_life(0))
        pick = fr[::4]
        sheet = Image.new('RGBA', (112 * len(pick), 104), (120, 150, 190, 255))
        for i, f in enumerate(pick): sheet.alpha_composite(Image.fromarray(f), (i * 112, 0))
        sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(sys.argv[-1]); sys.exit()
    if '--preview' in sys.argv:
        row = Image.new('RGBA', (64 * 4, 64), (120, 150, 190, 255))
        for i in range(4): row.alpha_composite(Image.fromarray(composite(draw_parts(i))), (i * 64, 0))
        row.resize((row.width * 6, row.height * 6), Image.NEAREST).save(sys.argv[sys.argv.index('--preview') + 1]); sys.exit()
    for i, name in enumerate(STAGES):
        layers = draw_parts(i)
        look = types.SimpleNamespace(draw_parts=lambda L=layers: {n: a.copy() for n, a in L.items()}, composite=composite, ORDER=ORDER, RIG=D.RIG)
        small, big = A.N.build_rig(look, FOLLOW)
        root = os.path.join(OUT, VARIANT) if VARIANT else OUT
        out = root if i == 0 else os.path.join(root, name)
        os.makedirs(out, exist_ok=True)
        A.N.build_all(small, big, MOVES, out, JS if i == 0 and not VARIANT else os.devnull, 'DV_MOVES', 'devoted_draw.py', life_fn=make_life(i), idle=idle_keys)
        if i:
            p = os.path.join(out, 'icon.png')
            if os.path.exists(p): os.remove(p)
        print(name, 'built')
