"""THE DEVOTED (WIP test fighter) - a quiet, pale man with a kitchen knife who prays to a symbol, and a black
sludge that takes a little more of him every time he does. Four looks, one per sludge stage:

  DEFAULT  clean: white shirt, dark trousers, a faint smile
  SEMI     sludge drips from his hair down his face and shoulders; the smile widens
  TAKEN    most of him is covered; a wide toothy grin
  DROWNED  he's all sludge but his eyes and a huge grin - and one giant demon wing grows from his back

Built on AERO's skeleton (tools/sprites/aero_moves.py: the same parts and the same moves, minus FULL AERO's
spear moves); his move table is src/fighters/dvMoves.js (generated here). The knife is drawn into his front fist; the scarf slot is the demon wing (DROWNED) or a sludge strand.

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
SHIRT = [0x8a8a86, 0xb0b0aa, 0xd2d2ca, 0xecece4]       # off-white shirt, shadow -> light
PANTS = [0x22222a, 0x2e2e38, 0x3c3c48, 0x4a4a58]
SHOE = [0x141216, 0x1e1c22, 0x2a2830, 0x36343c]
SKIN = [0xa88e7e, 0xc8ad9c, 0xe0c8b6, 0xf0dccc]
HAIR = [0x1e1612, 0x2e221c, 0x3e2e24]
SLUDGE = [0x060508, 0x0e0c12, 0x1a1720, 0x2e2a38]     # black sludge, with an oily sheen
SHEEN = 0x4a4458
# how much of him the sludge covers at each stage (0 = none, 1 = all of him)
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
    """Is this pixel under sludge? It pours down from the top of his head, unevenly, in runs and drips."""
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
        else:
            a[y, x] = hx(ramp[min(len(ramp) - 1, int(v[y, x] * (len(ramp) - 0.01)))])
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
    """His head, facing right: messy dark hair, two dark eyes, and a smile that grows with every stage."""
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    d.ellipse([26, 6, 41, 22], fill=(255, 255, 255, 255))
    h = np.zeros((64, 64, 4), np.uint8); s = np.array(im)[..., 3] > 0
    yy, xx = np.mgrid[0:64, 0:64]
    for y, x in zip(*np.nonzero(s)):
        v = 1 - min(1, math.hypot(x - 37, y - 10) / 13)
        h[y, x] = hx(SKIN[min(3, int(v * 3.99))])
    # hair: a messy mop over the top and the back
    for y, x in zip(*np.nonzero(s)):
        top = 10 + (noise(x, 0, 2) - 0.5) * 3
        if y < top or (x < 31 and y < 18 - (x - 26) * 0.3):
            h[y, x] = hx(HAIR[int(noise(x, y, 4) * 2.99)])
    for x in range(25, 42):                                    # a few strands over the edge
        if noise(x, 1, 6) < 0.35:
            for y in range(5, 7):
                if not s[y, x]: h[y, x] = hx(HAIR[0])
    a = h
    # the sludge (from stage 1 on it pours down from his hair; DROWNED: all of him)
    hair = np.zeros((64, 64), bool)
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        if tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in HAIR]: hair[y, x] = True
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        if stage == 1:                    # SEMI: his hair is soaked, and it runs down his face in a few streaks
            on = hair[y, x] or (x in (30, 32, 38, 41) and y < 11 + noise(x, 0, 5) * 8) or (x == 36 and y < 12)
        elif stage == 2:                  # TAKEN: all of his head but a patch of face round the eyes and the grin
            on = ((x - 37) / 5.5) ** 2 + ((y - 15) / 4.5) ** 2 > 1 + (noise(x, y, 3) - 0.5) * 0.5
        else: on = stage == 3
        if on: a[y, x] = hx(SLUDGE[3 if noise(x, y, 8) > 0.9 else 1 + int(noise(x, y, 9) * 1.99)])
    # the face: eyes, then the smile (drawn over the sludge - it never covers those)
    eye = 0x14100e if stage < 3 else 0xf4f0e8
    for x in (35, 39):
        a[12, x] = hx(eye); a[13, x] = hx(eye)
        if stage == 3: a[12, x] = hx(0xffffff)
    if stage >= 2:                                            # dark hollows round the eyes
        for x in (34, 36, 38, 40):
            if a[13, x, 3] and stage < 3: a[13, x] = hx(0x6a4a44)
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
    a = outline(a)
    a[22, 31:36] = np.where(a[22, 31:36, 3:4] > 0, a[22, 31:36], hx(LINE))   # (neck shadow)
    return a

def knife(a):
    """A kitchen knife in his front fist, blade forward."""
    a = a.copy()
    for x, y in [(43, 26), (44, 26), (45, 25)]: a[y, x] = hx(0x3a2418)        # the handle, showing through his grip
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    d.polygon([(46, 25), (55, 20), (57, 19), (54, 22), (47, 26)], fill=(255, 255, 255, 255))
    m = np.array(im)[..., 3] > 0
    for y, x in zip(*np.nonzero(m)):
        if not a[y, x, 3] or x > 46: a[y, x] = hx(0xe8ecf0 if y < 22 or (x + y) % 5 == 0 else 0xb8bec6)
    a[19, 57] = hx(0xffffff)
    # outline the blade only where it sticks out past the fist
    s = a[..., 3] > 0
    ring = ~s & (sh(s, 1, 0) | sh(s, -1, 0) | sh(s, 0, 1) | sh(s, 0, -1))
    ring[:, :46] = False
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
    if stage >= 1:                                                         # a sludge strand down his back
        n = 4 + stage * 4
        for i in range(n):
            x, y = 28 - i // 3, 22 + i
            a[y, x] = hx(SLUDGE[1]); a[y, x - 1] = hx(SLUDGE[0])
        return outline(a)
    a[24, 29] = hx(SHIRT[1])                                               # (hidden behind his back)
    return a

def draw_parts(stage):
    base = D.draw_parts()
    P = {}
    for n, l in base.items():
        if n in ('head', 'fish', 'scarf'): continue
        P[n] = repaint(l, KIND.get(n, SHIRT), stage, hash(n) % 97)
    P['ffist'] = knife(P['ffist'])
    P['head'] = head(stage)
    f = np.zeros((64, 64, 4), np.uint8); f[16, 33] = P['head'][16, 33] if P['head'][16, 33, 3] else hx(SKIN[2])   # (the goldfish slot: a still pixel of his cheek)
    P['fish'] = f
    P['scarf'] = wing(stage)
    return P

ORDER = D.ORDER
# AERO's moves without FULL AERO's spear moves (k_*, upb_king) - he never uses them, and they'd push the moves
# sheet past the 4096 px phones can load. Its own frame table: src/fighters/dvMoves.js
MOVES = {k: v for k, v in A.MOVES.items() if not k.startswith('k_') and k != 'upb_king'}
JS = os.path.join(ROOT, 'src/fighters/dvMoves.js')
FOLLOW = dict(A.FOLLOW, fish=(0, 0), scarf=(0.5, 1.0))

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
    if '--preview' in sys.argv:
        row = Image.new('RGBA', (64 * 4, 64), (120, 150, 190, 255))
        for i in range(4): row.alpha_composite(Image.fromarray(composite(draw_parts(i))), (i * 64, 0))
        row.resize((row.width * 6, row.height * 6), Image.NEAREST).save(sys.argv[sys.argv.index('--preview') + 1]); sys.exit()
    for i, name in enumerate(STAGES):
        layers = draw_parts(i)
        look = types.SimpleNamespace(draw_parts=lambda L=layers: {n: a.copy() for n, a in L.items()}, composite=composite, ORDER=ORDER, RIG=D.RIG)
        small, big = A.N.build_rig(look, FOLLOW)
        out = OUT if i == 0 else os.path.join(OUT, name)
        os.makedirs(out, exist_ok=True)
        A.N.build_all(small, big, MOVES, out, JS if i == 0 else os.devnull, 'DV_MOVES', 'devoted_draw.py', life_fn=make_life(i), idle=A.idle_keys)
        if i:
            p = os.path.join(out, 'icon.png')
            if os.path.exists(p): os.remove(p)
        print(name, 'built')
