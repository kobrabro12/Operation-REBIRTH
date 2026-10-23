"""NU's BONEZ costume: a black skeleton onesie, glow-in-the-dark. Same body, joints and rig as nu_draw.py (so
every animation in nu_moves.py plays on it), redrawn:

  - a black onesie printed with glowing bones: ribcage, spine, pelvis, arm and leg bones
  - the hood up, a skull printed on it with little horns of fabric, his face peeking out
  - footie feet with toe bones, bony gloves
  - the mic glowing the same ghostly green

  python3 tools/sprites/nu_bones_draw.py preview.png
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw as N

BLACK = (0x34303c, 0x1e1b24, 0x0e0c12)
BONE = 0xe8ffd8                                    # bone print: off-white with a glow-in-the-dark green tint
GLOW = 0x9aff6a
PAL = {
    'hood': BLACK, 'pants': BLACK, 'shoe': BLACK, 'band': BLACK,
    'acid': (0xd8ffb0, GLOW, 0x4ab02a),
}
OUT = 0x08060c
hx = N.hx

def line(a, pts, col):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3] and tuple(a[y, x, :3]) != tuple(hx(N.OUT)[:3]): a[y, x] = hx(col)

def bone_down(a, col=BONE):
    """A bone printed down the middle of a limb part: a line along its long axis with knobs at each end."""
    ys, xs = np.nonzero((a[..., 3] > 0) & ~np.all(a[..., :3] == np.array(hx(N.OUT)[:3]), -1))
    if len(ys) < 6: return
    pts = np.stack([xs, ys], 1).astype(float); c = pts.mean(0)
    u, s, vt = np.linalg.svd(pts - c); ax = vt[0]
    proj = (pts - c) @ ax; lo, hi = proj.min() + 1.5, proj.max() - 1.5
    for k in np.linspace(lo, hi, int(hi - lo) + 1):
        x, y = np.round(c + ax * k).astype(int); line(a, [(x, y)], col)
    for k in (lo, hi):
        x, y = np.round(c + ax * k).astype(int)
        nx, ny = np.round(np.array([-ax[1], ax[0]])).astype(int)
        line(a, [(x + nx, y + ny), (x - nx, y - ny)], col)

def draw_parts():
    old = dict(N.PAL)
    N.PAL.update(PAL)
    try:
        P = N.draw_parts()
    finally:
        N.PAL.clear(); N.PAL.update(old)
    # ---- the body: ribcage, sternum, spine and pelvis printed on black
    t = P['torso']; body = t[..., 3] > 0
    for y in range(22, 41):
        for x in range(24, 43):
            if body[y, x] and tuple(t[y, x, :3]) not in (tuple(hx(BLACK[0])[:3]), tuple(hx(BLACK[2])[:3]), tuple(hx(OUT)[:3]), tuple(hx(N.OUT)[:3])): t[y, x] = hx(BLACK[1])
    line(t, [(33, y) for y in range(24, 33)], BONE)                          # sternum
    for r, y in enumerate((25, 27, 29, 31)):                                  # ribs curving out both ways
        w = 6 - abs(r - 1)
        line(t, [(33 - i, y + (i // 3)) for i in range(1, w + 1)] + [(33 + i, y + (i // 3)) for i in range(1, w + 1)], BONE)
    line(t, [(33, y) for y in range(33, 37)], 0xb8d8a8)                      # spine
    line(t, [(29, 37), (30, 38), (31, 38), (32, 37), (34, 37), (35, 38), (36, 38), (37, 37), (33, 38), (33, 39)], BONE)   # pelvis
    t[40, 25:42][t[40, 25:42, 3] > 0] = hx(BLACK[2])
    P['torso'] = t
    for nm in ('bupper', 'fupper', 'bthigh', 'fthigh', 'bshin', 'fshin'):
        bone_down(P[nm])
    for nm in ('bfore', 'ffore'):
        bone_down(P[nm], 0xc8e8b8)
    # ---- footie feet: toe bones
    for nm, x0 in (('bshoe', 18), ('fshoe', 40)):
        a = P[nm]
        for i in range(4):
            line(a, [(x0 + 2 + i * 2, 55), (x0 + 2 + i * 2, 56)], BONE)
        a[57, :][a[57, :, 3] > 0] = hx(BLACK[2])
    # ---- hands: bony gloves (knuckle dots)
    for nm in ('ffist', 'bfore'):
        a = P[nm]; sk = np.zeros(a.shape[:2], bool)
        for c in N.PAL['skin']: sk |= np.all(a[..., :3] == np.array(hx(c)[:3]), -1) & (a[..., 3] > 0)
        ys, xs = np.nonzero(sk)
        for y, x in zip(ys, xs): a[y, x] = hx(BLACK[1])
        for y, x in list(zip(ys, xs))[::5]: a[y, x] = hx(0xd0e8c0)       # knuckle bones
    # ---- face: no war paint, sleepy eyes under the hood
    h = P['head']
    h[12:15, 31:40][h[12:15, 31:40, 3] > 0] = hx(N.PAL['skin'][1])
    h[13, 36:38] = hx(0x2a2630); h[13, 33] = hx(0x2a2630); h[12, 36:38] = hx(N.PAL['skin'][2])
    h[18, 36:39] = hx(N.PAL['skin'][2]); h[19, 38] = hx(N.PAL['skin'][1])
    P['head'] = h
    # ---- the hood: up over his head, a skull printed on it, two little fabric horns
    im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.pieslice([25, 3, 43, 23], 180, 360, fill=hx(BLACK[1]))
    d.rectangle([25, 12, 29, 21], fill=hx(BLACK[1]))                          # the back of the hood, down to the neck
    d.polygon([(27, 6), (25, 1), (29, 4)], fill=hx(BLACK[1])); d.polygon([(39, 5), (42, 1), (41, 6)], fill=hx(BLACK[1]))   # horns
    hood = N.finish(im, BLACK)
    hood[12, 30:42] = hx(OUT)                                                 # the hood's front edge over his brow
    skull = ['.#####.', '#######', '##.#.##', '#######', '.#.#.#.']           # a skull printed on top
    for j, row in enumerate(skull):
        for i, ch in enumerate(row):
            if ch == '#': hood[5 + j, 30 + i] = hx(BONE)
    hood[7, 32] = hx(GLOW); hood[7, 34] = hx(GLOW)                            # glowing eye sockets
    P['hair'] = hood
    # ---- mic: ghostly green glow, a black cord
    m = P['mic']
    m[17, 44] = hx(0xffffff); m[17, 45] = hx(GLOW); m[18, 44:46] = hx(GLOW)
    P['mic'] = m
    return P

ORDER, RIG = N.ORDER, N.RIG
def composite(P, hide=('can',)): return N.composite(P, hide)

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (60, 70, 90, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'nu_bones.png')
