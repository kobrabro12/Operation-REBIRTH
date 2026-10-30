"""SCORCHED EARTH - an AERO costume from Mason's drawing: a charcoal-grey devil cooled out of lava. Grey rock plates
with molten cracks glowing yellow / orange / red along every edge, two curled lava horns on his fishbowl - smoked glass
now, half full of glowing lava, the goldfish still swimming in it - lava-soled boots, and a long whip of a tail with an
arrowhead tip.

The tail is two new rig parts: 'scarf' (AERO's scarf slot - every move already swings it) is the tail's base, hung
from the small of his back, and 'tailtip' hangs off its end with more lag and its own wave, so the tail cracks like a
whip on every swing and curls and uncurls when he stands still.

  python3 tools/sprites/aero_scorched.py [--preview FILE]
  -> moves_sheet.png in public/assets/fighters/aero/scorched/, the small strips (idle/run/jump/fall) in
     src/fighters/aero_scorched/ (the game inlines those into its code, so they don't add files to the build)
"""
import os, sys, math, shutil, types
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import aero_draw as D
import aero_moves as A

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT_BIG = os.path.join(ROOT, 'public/assets/fighters/aero/scorched')
OUT_SMALL = os.path.join(ROOT, 'src/fighters/aero_scorched')

def hx(c): return np.array([c >> 16 & 255, c >> 8 & 255, c & 255, 255], np.uint8)
LINE = 0x140808                                       # outline: near-black, warm
ROCK = [0x2e2e36, 0x42424c, 0x56565f, 0x6a6a74]      # charcoal plates, dark -> light
LAVA_LIT = [0xffd23a, 0xff9a1a, 0xffe87a]            # cracks on the lit (top / left) edges
LAVA_DARK = [0xd8401a, 0x9a1a10, 0xff6a1a]           # and on the shadow side
HORN = [0x8a1a0e, 0xd8401a, 0xff8a1a, 0xffd23a]

def sh(m, dy, dx):
    H, W = m.shape; o = np.zeros_like(m)
    o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return o

def outline(a):
    s = a[..., 3] > 0
    ring = ~s & (sh(s, 1, 0) | sh(s, -1, 0) | sh(s, 0, 1) | sh(s, 0, -1))
    a[ring] = hx(LINE); return a

def scorch(a, seed=0, gaps=3):
    """Repaint one of AERO's parts: charcoal rock shaded like the original, a molten crack along its edges."""
    a = a.copy(); s = a[..., 3] > 0
    old_line = s & np.all(a[..., :3] == hx(D.OUT)[:3], -1)
    fill = s & ~old_line
    lum = a[..., :3].astype(float).mean(-1) / 255
    if fill.any():
        lo, hi = np.percentile(lum[fill], 5), np.percentile(lum[fill], 95)
        v = np.clip((lum - lo) / max(1e-3, hi - lo), 0, 1)
    yy, xx = np.mgrid[0:64, 0:64]
    for y, x in zip(*np.nonzero(fill)): a[y, x] = hx(ROCK[min(3, int(v[y, x] * 3.99))])
    lit = fill & (old_line.__or__(~s)).__and__(True)                       # placeholder (replaced below)
    up = sh(old_line | ~s, 1, 0) | sh(old_line | ~s, 0, 1)                 # empty / outline above or to the left
    dn = sh(old_line | ~s, -1, 0) | sh(old_line | ~s, 0, -1)
    edge = fill & (up | dn)
    for y, x in zip(*np.nonzero(edge)):
        h = (x * 7 + y * 13 + seed * 5) % 11
        if h < gaps: continue                                              # (a cooled gap in the crack)
        pal = LAVA_LIT if up[y, x] else LAVA_DARK
        a[y, x] = hx(pal[h % 3])
    a[old_line] = hx(LINE)
    return a

def crack(a, pts, cols=(0xff9a1a, 0xffd23a)):
    """A glowing crack across a plate (only where the plate is)."""
    for i, (x, y) in enumerate(pts):
        if 0 <= x < 64 and 0 <= y < 64 and a[y, x, 3] and not np.all(a[y, x, :3] == hx(LINE)[:3]): a[y, x] = hx(cols[i % len(cols)])

def draw_parts():
    P = {n: scorch(l, i) for i, (n, l) in enumerate(D.draw_parts().items()) if n not in ('head', 'fish', 'scarf')}
    yy, xx = np.mgrid[0:64, 0:64]
    # ---- torso: cracks running across the chest plate, a molten belt
    t = P['torso']
    crack(t, [(31, 25), (32, 26), (32, 27), (33, 28), (34, 28), (35, 29), (35, 30)])
    crack(t, [(29, 31), (30, 32), (30, 33), (31, 34), (31, 35)], (0xd8401a, 0xff8a1a))
    for x in range(27, 40):
        if t[38, x, 3] and not np.all(t[38, x, :3] == hx(LINE)[:3]): t[38, x] = hx([0xff8a1a, 0xd8401a, 0xffd23a][x % 3])
    # ---- boots: lava soles (the bottom rows of each shoe glow)
    for n in ('bshoe', 'fshoe'):
        a = P[n]; s = (a[..., 3] > 0) & ~np.all(a[..., :3] == hx(LINE)[:3], -1)
        ys = np.nonzero(s.any(1))[0]
        if len(ys):
            bot = ys.max()
            for y, x in zip(*np.nonzero(s & (yy >= bot - 1))): a[y, x] = hx(0xffd23a if y == bot - 1 else 0xd8401a)
            for y, x in zip(*np.nonzero(s & (yy == bot - 2))):
                if x % 2: a[y, x] = hx(0xff8a1a)
    # ---- fists: glowing knuckles
    for n in ('ffist',):
        crack(P[n], [(44, 24), (45, 25), (46, 26)], (0xffd23a, 0xff8a1a))
    # ---- the head: still his fishbowl - smoked, soot-dark glass now, half full of glowing lava instead of water,
    # with a molten crack round its rim and two curled lava horns; the goldfish still swims inside
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    d.ellipse([24, 4, 42, 22], fill=(255, 255, 255, 255))
    h = np.array(im); s = h[..., 3] > 0
    up = sh(~s, 1, 0) | sh(~s, 0, 1); dn = sh(~s, -1, 0) | sh(~s, 0, -1); rim = s & (up | dn)
    SMOKE = [0x1e1e26, 0x2a2a34, 0x383844, 0x484854]
    LAVA = [0xffd23a, 0xff7a1a, 0xd8401a, 0xa8240e, 0x6a1408]
    for y, x in zip(*np.nonzero(s)):
        if y < 17:                                                           # smoked glass above the lava
            v = 1 - min(1, math.hypot(x - 29, y - 7) / 14)
            h[y, x] = hx(SMOKE[min(3, int(v * 3.99))])
        else:                                                                # the lava: bright at its surface, darker below
            c = LAVA[min(4, (y - 17 + 1) // 1)]
            if (x * 7 + y * 5) % 13 == 0 and y > 18: c = 0xffb02a          # (glowing blobs in it)
            h[y, x] = hx(c)
    for y, x in zip(*np.nonzero(rim)):                                      # the molten crack round the bowl's rim
        k = (x * 5 + y * 3) % 7
        if k and y < 17: h[y, x] = hx((LAVA_LIT if up[y, x] else LAVA_DARK)[k % 3])
    for (x, y) in [(27, 7), (28, 6), (29, 6), (27, 8), (26, 9), (26, 10)]: h[y, x] = hx(0x9a9aa8)   # the glass's shine, sooty
    h[8, 39] = hx(0x7a7a88)
    for (x, y) in [(31, 19), (37, 18), (34, 20)]: h[y, x] = hx(0xfff4b0)      # bubbles popping in the lava
    # horns: curling up and in from the top of the bowl
    hm = Image.new('RGBA', (64, 64)); hd = ImageDraw.Draw(hm)
    L = [(28, 7), (25, 7), (22, 6), (21, 3), (22, 0), (24, 0), (24, 2), (24, 4), (26, 5), (28, 5)]   # a crescent, tip curling in
    hd.polygon(L, fill=(255, 255, 255, 255)); hd.polygon([(66 - x, y) for x, y in L], fill=(255, 255, 255, 255))
    hn = np.array(hm)[..., 3] > 0
    for y, x in zip(*np.nonzero(hn)):
        k = 3 if y <= 1 else 2 if y <= 4 else 1
        if (x <= 22 or x >= 44) and y > 2: k = 0                              # their outer curve in shadow
        h[y, x] = hx(HORN[k])
    a = outline(h)
    for x in range(28, 39):                                                  # the collar ring: charcoal with a lava seam
        if a[21, x, 3]: a[21, x] = hx(0xff8a1a if x % 3 else 0xffd23a)
        if a[22, x, 3]: a[22, x] = hx(0x2a2a34)
    P['head'] = a
    # ---- the goldfish: still in there, swimming through the lava (a little brighter, so it shows)
    f = D.draw_parts()['fish'].copy()
    m = f[..., 3] > 0
    for y, x in zip(*np.nonzero(m)):
        r_, g_, b_ = (int(c) for c in f[y, x, :3])
        if (r_, g_, b_) != (0x8a, 0x3a, 0x10) and (r_, g_, b_) != (255, 255, 255) and r_ > 100:
            f[y, x, :3] = (min(255, r_ + 20), min(255, g_ + 40), min(255, b_ + 30))
        elif (r_, g_, b_) == (0x8a, 0x3a, 0x10): f[y, x, :3] = (0x2a, 0x08, 0x06)   # a darker edge so he stands out against the lava
    P['fish'] = f
    # ---- the tail: base from the small of his back ('scarf' slot), and the whip end with its arrowhead ('tailtip')
    def tail(pts, w):
        im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
        d.line(pts, fill=(255, 255, 255, 255), width=w, joint='curve')
        return np.array(im)[..., 3] > 0
    base = tail([(27, 37), (24, 41), (20, 44), (15, 46)], 3)
    tip = tail([(15, 46), (11, 47), (8, 45), (7, 42)], 2)
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    d.polygon([(7, 43), (4, 40), (6, 36), (9, 39)], fill=(255, 255, 255, 255))   # the arrowhead
    head = np.array(im)[..., 3] > 0
    def paint(m, arrow=None):
        a = np.zeros((64, 64, 4), np.uint8)
        up = sh(~m, 1, 0) | sh(~m, 0, 1)
        for y, x in zip(*np.nonzero(m)):
            a[y, x] = hx(0xffd23a if up[y, x] and (x + y) % 3 else 0xff7a1a if (x + y) % 4 else 0xd8401a)
        if arrow is not None:
            for y, x in zip(*np.nonzero(arrow)):
                a[y, x] = hx(0xffe87a if y < 38 else 0xffd23a if x < 7 else 0xd8401a)
        return outline(a)
    P['scarf'] = paint(base)
    P['tailtip'] = paint(tip & ~head, head)
    return P

ORDER = ['scarf', 'tailtip'] + [n for n in D.ORDER if n != 'scarf']
RIG = dict(D.RIG, scarf=((27, 37), 'torso'), tailtip=((15, 46), 'scarf'))
FOLLOW = dict(A.FOLLOW, scarf=(0.55, 1.3), tailtip=(0.9, 2.4))

def life(pose, t):
    """AERO's own life (breathing, the goldfish swimming, his scarf-slot flutter = the tail's wag), plus: the
    tail's end waves a beat behind its base, so the tail curls and uncurls like a living thing."""
    p = A.life(pose, t)
    sc = A.N.full(p.get('scarf')); sc[0] -= 4 * math.sin(t * 0.21) + 1.5 * math.sin(t * 0.53)   # (a heavier tail: less flutter at the base)
    p['scarf'] = tuple(sc)
    tt = A.N.full(p.get('tailtip'))
    tt[0] += 18 * math.sin(t * 0.21 - 1.4) + 7 * math.sin(t * 0.53 - 0.9)
    p['tailtip'] = tuple(tt)
    return p

def composite(layers, hide=()):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = layers[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    layers = draw_parts()
    if '--preview' in sys.argv:
        c = composite(layers)
        bg = Image.new('RGBA', (64, 64), (120, 160, 220, 255)); bg.alpha_composite(Image.fromarray(c))
        bg.resize((512, 512), Image.NEAREST).save(sys.argv[sys.argv.index('--preview') + 1]); sys.exit()
    look = types.SimpleNamespace(draw_parts=lambda: {n: a.copy() for n, a in layers.items()}, composite=composite, ORDER=ORDER, RIG=RIG)
    small, big = A.N.build_rig(look, FOLLOW)
    A.N.GHOST = (255, 138, 26)
    tmp = OUT_BIG
    A.N.build_all(small, big, A.MOVES, tmp, os.devnull, 'AERO_MOVES', 'aero_moves.py', life_fn=life, idle=A.idle_keys)
    os.makedirs(OUT_SMALL, exist_ok=True)
    for k in ('idle', 'run', 'jump', 'fall'): shutil.move(os.path.join(tmp, k + '_sheet.png'), os.path.join(OUT_SMALL, k + '_sheet.png'))
    print('SCORCHED EARTH built')
