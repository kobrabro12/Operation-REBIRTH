"""THE ARCHIVIST at the RECORDS counter (Trinkets > LORE), rendered like HANZ in LOST: a PS1-look 3D model built
from hard-faceted hulls (hanz_3d.py's kit: baked vertex light, wobbly snapped vertices, 15-bit dithered colour,
320x180 drawn at 2x).

Her: a neat, cheerful records clerk - a round cream head (no face in the model: the game draws her face on it, so
it can be as expressive as Mason's drawing: curved lids over dot eyes, a wide open smile), a dark chestnut bob, a
structured navy cap with a short stiff brim, a maroon velvet band and a brass badge (a nod to ENA: Dream BBQ's felt
hat, our own design), a navy double-breasted blazer with gold buttons over a white blouse and a maroon bow, white
gloves. Behind her: her paperwork bins, card-catalogue cabinets, a clock. On the counter: a brass bell, a green
banker's lamp, a stamp pad, a tray of folders and her BRIEFCASE.

Every frame she's rebuilt from a POSE (keyed in ANIMS, eased) and rendered with the counter and the bins as holdouts
(they cut her out where they're in front of her), so the game draws: room, counter, her. Per frame the table also
gives where her FACE is on the screen (centre, size, roll, how much it faces you) and where each HAND is (to hold a
folder, throw papers, reach through a portal).

Run:  python3 tools/sprites/archivist_3d.py [--only idle,dig,...] [--preview DIR]
      -> public/assets/lore/records/room.png, counter.png, arch_<anim>.png and src/scenes/recordsFrames.js
         (generated: do not edit by hand). Needs bpy and imagequant (pip install bpy imagequant).
"""
import os, sys, math, json, argparse
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import hanz_3d as H
import bpy
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/lore/records')
TABLE = os.path.join(ROOT, 'src/scenes/recordsFrames.js')
CAM = ((0, -170, 50), (0, 30, 36), 31)           # where the camera is, what it looks at, its lens (mm)
VW, VH = 640, 360
FPS = 15
UPPER, FORE = 20.5, 19.5                         # arm bones
SHOULDER = (14.2, 0.5, 32.5)                     # shoulder joints on her body (x either side)
NECK = (0, 0.5, 41.0)                            # where her head sits on her body
HOME = (0, 26, -3)                               # her hips, standing behind the counter

# ------------------------------------------------------------------ colours
SKIN = 0xf3e9d6; SKIN_D = 0xe2d2ba                # her face plate and neck (cream, like paper)
HAIR = 0x3b2420; HAIR2 = 0x2a1814                # dark chestnut bob
NAVY = 0x223058; NAVY2 = 0x1a2546; NAVY3 = 0x2c3c6c   # the cap and blazer
MAROON = 0x7c1f30; MAROON2 = 0x5e1624            # the velvet band, the bow
GOLD = 0xd9ab48; GOLD2 = 0xa87c2c                # badge, buttons, brass
WHITE = 0xf4f1ea; WHITE2 = 0xd8d4cc              # blouse, gloves
WALNUT = 0x6b4226; WALNUT2 = 0x86552f; WALNUT3 = 0x4a2b18; WALNUT4 = 0x5a361f
WALL = 0xcfc7a4; WALL2 = 0xb9b08c                # sage-cream wallpaper
PAPER = 0xf1ead6; PAPER2 = 0xe4dbc0; MANILA = 0xe2c47e; MANILA2 = 0xc9a862
LEATHER = 0x7a4a2a; LEATHER2 = 0x5c3520
GREEN = 0x2f7a52; GREEN2 = 0x215a3a              # banker's lamp shade
LAMPGLOW = 0xfff0b8                              # under the lamp's shade, the bulbs
INKPAD = 0x8a1c26; RUBBER = 0x2a2226; IRON = 0x3a3a44
CLOCKF = 0xf2ecd8; INKC = 0x141216
FLOOR = 0x4a3326
COCOA = 0x5a2e1a; COCOA2 = 0x7a4228                # hot cocoa
MALLOW = 0xfff4f0; MALLOW2 = 0xf6c8d4            # marshmallows, white and pink
CREAM = 0xf0e4c8; CHROME = 0xc8ccd4; CHROME2 = 0x8e939e   # the cocoa machine's enamel and steel
RED = 0xd8323a; MINT = 0x3ec8a0; SUNNY = 0xf8c838; PINK = 0xf070b0; SKY = 0x48a8f0   # boombox stickers, cassette labels
PLASTIC = 0x2a2a34; PLASTIC2 = 0x40404c; GRILL = 0x18181e
LEAF = 0x3e8a44; LEAF2 = 0x2c6a34; TERRA = 0xb05a34; LENS = 0xa8d8f0; GRAPH = 0x48a060

for k, cols, look in (('a_skin', (SKIN, SKIN_D), (0.08, 0, 1)), ('a_hair', (HAIR, HAIR2), (0.22, 0, 1)),
                      ('a_felt', (NAVY, NAVY2, NAVY3), (0.06, 0, 1)), ('a_velvet', (MAROON, MAROON2), (0.3, 0, 1)),
                      ('a_gold', (GOLD, GOLD2), (0.7, 0, 1)), ('a_cotton', (WHITE, WHITE2), (0.05, 0, 1)),
                      ('a_wood', (WALNUT, WALNUT2, WALNUT3, WALNUT4, FLOOR), (0.16, 0, 1)), ('a_wall', (WALL, WALL2), (0, 0, 1)),
                      ('a_paper', (PAPER, PAPER2, MANILA, MANILA2, CLOCKF), (0, 0, 1)), ('a_leather', (LEATHER, LEATHER2), (0.35, 0, 1)),
                      ('a_glassg', (GREEN, GREEN2), (0.55, 0, 1)), ('a_glow', (LAMPGLOW,), (0, 1.1, 1)),
                      ('a_rubber', (INKPAD, RUBBER, IRON, INKC), (0.2, 0, 1)),
                      ('a_cocoa', (COCOA, COCOA2), (0.45, 0, 1)), ('a_mallow', (MALLOW, MALLOW2, CREAM), (0.05, 0, 1)),
                      ('a_steel', (CHROME, CHROME2), (0.8, 0, 1)), ('a_plastic', (RED, MINT, SUNNY, PINK, SKY, PLASTIC, PLASTIC2, GRILL), (0.35, 0, 1)),
                      ('a_leaf', (LEAF, LEAF2, TERRA, GRAPH), (0.1, 0, 1)), ('a_lens', (LENS,), (0.9, 0, 1))):
    H.KINDS[k] = cols; H.LOOK[k] = look
H.SMOOTH.update({'head': 75, 'hair': 60, 'glove': 70, 'neck': 75, 'bell': 80, 'clock': 80, 'shade': 60, 'hatcrown': 40})
# a warm reading-room light: key from the high left in front, a cool window fill from the right, a soft lamp bounce
H.LIGHTS[:] = [((0.42, 0.62, -0.66), (1.0, 0.9, 0.74), 0.95),
               ((-0.62, -0.25, -0.74), (0.7, 0.78, 1.0), 0.42),
               ((0.0, 0.85, 0.5), (1.0, 0.86, 0.7), 0.2)]
H.AMBIENT = (0.34, 0.31, 0.32)
H.FOG = (5000.0, 9000.0, (0.5, 0.45, 0.4), 0.0)


def ell(c, r, M=None, nu=12, nv=7, cut=None):
    """Points of an ellipsoid centred on c with radii r (x, y, z); cut(x, y, z) -> False drops a point."""
    pts = []
    for i in range(nv + 1):
        v = -math.pi / 2 + math.pi * i / nv
        for j in range(nu if 0 < i < nv else 1):
            u = 2 * math.pi * (j + 0.5 * (i % 2)) / nu
            p = (c[0] + r[0] * math.cos(v) * math.cos(u), c[1] + r[1] * math.cos(v) * math.sin(u), c[2] + r[2] * math.sin(v))
            if cut is None or cut(*p): pts.append(p)
    return pts


def ring(c, rx, ry, z, n=14, a0=0, a1=2 * math.pi):
    """n points on an ellipse at height z round c (x, y), evenly from angle a0 toward a1."""
    return [(c[0] + rx * math.cos(a0 + (a1 - a0) * k / n), c[1] + ry * math.sin(a0 + (a1 - a0) * k / n), z) for k in range(n)]


# ------------------------------------------------------------------ her
HEAD_R = (9.8, 9.0, 10.0)                        # her head's radii; the face is drawn on its front (-y)


def head(hat=None):
    """Her head in its own space (centre at 0): head, hair, and (hat = {lift, tilt}) the cap. Returns {name: Mesh}."""
    hat = hat or {}
    parts = {}
    m = H.Mesh(); m.hull(ell((0, 0, 0), HEAD_R, nu=16, nv=9), SKIN); parts['head'] = m
    # the bob: the back and top of the head, down to the jaw at the sides, a soft side-swept fringe under the brim
    hb = H.Mesh()
    hb.hull(ell((0, 1.6, 0.8), (10.3, 9.0, 11.4), nu=14, nv=8, cut=lambda x, y, z: y > -1.5 or z > 6.5), HAIR)
    for s in (-1, 1):                                                     # the bob's sides: full, framing her face to the jaw, a neat flip at the ends
        hb.hull([(s * 8.2, -5.0, 8.5), (s * 10.4, -3.0, 9.0), (s * 10.6, 3.5, 8.0), (s * 9.0, -5.6, 1.0), (s * 11.4, -4.0, 0.0),
                 (s * 11.8, 3.0, -1.0), (s * 8.6, -5.2, -7.0), (s * 11.6, -4.4, -8.4), (s * 12.6, 2.0, -8.8), (s * 10.0, 5.0, -6.0),
                 (s * 9.4, -4.4, -10.0), (s * 13.2, -3.0, -10.6), (s * 13.0, 1.5, -10.8), (s * 7.4, 7.0, -7.0)], HAIR)
    hb.hull([(-9.6, 4, -6), (9.6, 4, -6), (-8, 8.5, -4), (8, 8.5, -4), (-9, 6, 4), (9, 6, 4), (0, 10.2, 0), (0, 9.5, -7.5)], HAIR)   # the back
    hb.hull([(-8.6, -5.4, 7.4), (-2, -8.0, 8.2), (5.5, -7.2, 7.0), (8.8, -5.0, 6.2), (-6, -4, 10.5), (6, -4, 10.5),
             (8.6, -6.0, 4.2), (6.8, -7.0, 5.0)], HAIR2)                    # the fringe, swept to her left
    parts['hair'] = hb
    # the cap: a structured felt crown, flat-topped and a touch wider at the top, sitting tipped back on her head
    M = H.T(0, 1.0 + hat.get('back', 0), 7.6 + hat.get('lift', 0), rx=-9 + hat.get('tilt', 0), ry=hat.get('roll', 0))
    c = H.Mesh()
    c.hull(ring((0, 0, 0), 10.4, 9.8, 0, 16, 0, 2 * math.pi)[:16] + ring((0, 0, 0), 11.3, 10.7, 9.4, 16, 0, 2 * math.pi)[:16], NAVY, M)
    c.hull(ring((0, 0, 0), 11.1, 10.5, 9.3, 16, 0, 2 * math.pi)[:16] + ring((0, 0, 0), 10.6, 10.0, 10.3, 16, 0, 2 * math.pi)[:16], NAVY3, M)
    parts['hatcrown'] = c
    b = H.Mesh()
    b.hull(ring((0, 0, 0), 10.75, 10.15, -0.2, 16, 0, 2 * math.pi)[:16] + ring((0, 0, 0), 10.95, 10.35, 3.0, 16, 0, 2 * math.pi)[:16], MAROON, M)
    parts['hatband'] = b
    g = H.Mesh()                                                          # the badge: a brass shield with a star
    g.hull([(x, -10.85 - 0.15 * abs(x), z) for x, z in ((-2.4, 4.0), (2.4, 4.0), (-2.6, 6.6), (2.6, 6.6), (0, 3.0), (-1.4, 3.3), (1.4, 3.3), (0, 7.4))] +
           [(x, -10.15, z) for x, z in ((-2.4, 4.0), (2.4, 4.0), (-2.6, 6.6), (2.6, 6.6), (0, 3.0))], GOLD, M)
    g.box((0, -11.05, 5.3), (1.5, 0.4, 1.5), GOLD2, M)
    g.box((0, 0, 10.35), (1.8, 1.8, 0.5), GOLD, M)                       # (a little button on top)
    parts['hatbadge'] = g
    br = H.Mesh()                                                         # the brim: short, stiff, pointing a little down
    pts = []
    for k in range(9):
        a = math.radians(-160 + 140 * k / 8)
        for r, z in ((10.2, 0.2), (15.6, -1.6)):
            for dz in (0, 0.9):
                pts.append((r * 1.05 * math.cos(a), r * math.sin(a), z + dz - (0.6 if r > 12 else 0)))
    br.hull(pts, NAVY2, M); parts['hatbrim'] = br
    return parts


def torso(M):
    """Her blazer, blouse, bow and buttons on her body (M = the body's transform; hips at 0, up to the neck)."""
    out = {}
    t = H.Mesh()
    t.hull(ring((0, 0, 0), 10.2, 6.8, -22, 12, 0, 2 * math.pi)[:12] + ring((0, 0.3, 0), 10.0, 6.6, 4, 12, 0, 2 * math.pi)[:12] +
           ring((0, -0.2, 0), 12.0, 7.8, 18, 12, 0, 2 * math.pi)[:12] + ring((0, 0.3, 0), 14.6, 7.0, 31, 12, 0, 2 * math.pi)[:12] +
           ring((0, 0.5, 0), 9.0, 5.6, 37.5, 10, 0, 2 * math.pi)[:10], NAVY, M)
    out['blazer'] = t
    w = H.Mesh()                                                          # the blouse in the V of the lapels, its stand collar
    w.hull([(-4.6, -6.6, 36.2), (4.6, -6.6, 36.2), (0, -8.2, 22.5), (-3.2, -7.4, 30), (3.2, -7.4, 30), (0, -6.0, 37)] +
           [(x, y + 0.9, z) for x, y, z in ((-4.6, -6.6, 36.2), (4.6, -6.6, 36.2), (0, -8.2, 22.5))], WHITE, M)
    w.hull(ring((0, 0.5, 0), 5.0, 4.4, 37.0, 10, 0, 2 * math.pi)[:10] + ring((0, 0.5, 0), 4.6, 4.0, 40.2, 10, 0, 2 * math.pi)[:10], WHITE, M)
    out['blouse'] = w
    lp = H.Mesh()                                                         # the lapels
    for s in (-1, 1):
        lp.hull([(s * 4.8, -6.9, 36.4), (s * 0.4, -8.7, 22.2), (s * 8.6, -7.0, 31.5), (s * 7.4, -7.4, 25), (s * 5.4, -7.0, 35),
                 (s * 4.8, -6.1, 36.4), (s * 8.6, -6.2, 31.5), (s * 0.4, -7.9, 22.2)], NAVY3, M)
    out['lapels'] = lp
    bw = H.Mesh()                                                         # the maroon bow at her throat
    for s in (-1, 1):
        bw.hull([(0, -6.6, 36.6), (s * 3.9, -7.0, 38.2), (s * 4.1, -7.2, 34.9), (s * 3.6, -6.0, 36.6), (0, -5.8, 36.6)], MAROON, M)
        bw.hull([(s * 0.5, -6.7, 35.6), (s * 1.7, -6.9, 31.8), (s * 2.9, -6.6, 32.4), (s * 0.6, -5.9, 35.4)], MAROON2, M)
    bw.box((0, -6.9, 36.6), (1.5, 1.2, 1.7), MAROON2, M)
    out['bow'] = bw
    bt = H.Mesh()                                                         # double-breasted gold buttons, her name pin
    for z in (17, 10.5):
        for x in (-3.4, 3.4):
            bt.hull(ell((x, -8.05 + 0.03 * abs(z - 17), z), (0.85, 0.5, 0.85), nu=6, nv=3), GOLD, M)
    bt.box((-8.0, -7.85, 25.5), (3.6, 0.6, 1.1), GOLD, M)
    out['buttons'] = bt
    nk = H.Mesh(); nk.limb((0, 0.6, 38), (0, 0.6, 45), 3.1, 2.9, SKIN, sides=8, M=M); out['neck'] = nk
    return out


def legs(M, step):
    """Her pencil skirt, dark stockings and maroon loafers (the counter hides them until she walks to the back door).
    step = how far through her walk she is (one stride per 0.5): each leg swings forward and back in turn."""
    m = H.Mesh()
    m.hull(ring((0, 0, 0), 10.2, 6.8, -22, 12) + ring((0, 0.4, 0), 9.4, 6.2, -36, 12), NAVY, M)
    for s_ in (-1, 1):
        ph = 2 * math.pi * step + (0 if s_ < 0 else math.pi)
        fwd, lift = -6.5 * math.sin(ph) if step else 0, max(0, math.cos(ph)) * 2.6 if step else 0
        knee = (s_ * 4.4, 0.4 + fwd * 0.35, -34)
        ankle = (s_ * 4.2, 0.6 + fwd, -59 + lift)
        m.limb(knee, ankle, 2.4, 1.6, NAVY2, sides=6, M=M)
        m.hull([(ankle[0] + dx, ankle[1] + dy, ankle[2] + dz) for dx in (-1.8, 1.8) for dy in (-5.4, 2.0) for dz in (-2.8, 0.6)], MAROON2, M)
    return m


def ik(S, W, pole):
    """Two-bone arm: shoulder S, wrist target W, elbow pointing toward pole (a direction). Returns (elbow, wrist)."""
    S, W, pole = Vector(S), Vector(W), Vector(pole).normalized()
    d = (W - S).length; d = min(max(d, 4), (UPPER + FORE) * 0.995)
    n = (W - S).normalized(); W = S + n * d
    a = (UPPER ** 2 - FORE ** 2 + d * d) / (2 * d); h = math.sqrt(max(0, UPPER ** 2 - a * a))
    p = pole - n * pole.dot(n)
    if p.length < 1e-4: p = Vector((0, 0, -1)) - n * n.z
    return S + n * a + p.normalized() * h, W


def hand(s, W, dirv, nrm, shape):
    """Her white-gloved hand at wrist W: fingers along dirv, palm facing nrm. shape: open / fist / point / cup /
    flat. s = -1 her right hand (the picture's left), 1 her left. Returns (Mesh, centre)."""
    u = Vector(dirv).normalized(); wv = -Vector(nrm)
    wv = wv - u * wv.dot(u)
    if wv.length < 0.15:                                                   # (a palm normal blended through zero: any side will do)
        wv = Vector((0, 0, 1)) - u * u.z
        if wv.length < 0.15: wv = Vector((0, 1, 0)) - u * u.y
    wv = wv.normalized(); v = wv.cross(u)
    def P(a, b, c): return tuple(Vector(W) + u * a + v * b + wv * c)
    m = H.Mesh()
    m.hull([P(a, b, c) for a in (0.2, 5.2) for b in (-2.5, 2.5) for c in (-1.1, 1.1)], WHITE)   # palm
    th = -s                                                                # (the thumb's side)
    if shape == 'fist':
        m.hull([P(a, b, c) for a in (4.6, 7.4) for b in (-2.4, 2.4) for c in (-2.6, 0.9)], WHITE)
        m.limb(P(1.6, th * 2.3, -0.6), P(5.6, th * 1.2, -2.6), 1.15, 0.95, WHITE2, sides=6)
    else:
        curl = {'open': 0.0, 'point': 0.0, 'cup': 0.55, 'flat': -0.1, 'hold': 0.9}.get(shape, 0)
        tip = (9.6 - 2.6 * curl, -2.8 * curl)
        if shape == 'point':
            m.hull([P(a, b, c) for a in (4.8, 7.0) for b in (-2.3, 1.0) for c in (-2.2, 0.8)], WHITE)   # three curled
            m.limb(P(5.0, 1.75, 0), P(10.4, 1.9, 0.2), 0.95, 0.8, WHITE)                                 # the index finger out
        else:
            for k, b in enumerate((-1.75, -0.6, 0.6, 1.75)):
                ln = (0.88, 1.0, 0.96, 0.8)[k]
                m.limb(P(5.0, b, 0), P(5 + (tip[0] - 5) * ln, b * (1.08 if shape == 'open' else 1.0), tip[1] * ln), 0.78, 0.66, WHITE)
        m.limb(P(1.4, th * 2.4, -0.4), P(5.2, th * (3.9 - 1.6 * curl), -1.4 - 1.2 * curl), 1.1, 0.9, WHITE2, sides=6)
    return m, P(4.5, 0, 0), (u, v, wv)


def arm(s, S, W, pole, dirv, nrm, shape):
    """One arm: sleeve (upper + forearm), white cuff, glove. Returns ({name: Mesh}, elbow, wrist, hand centre)."""
    E, W = ik(S, W, pole)
    m = H.Mesh()
    m.limb(tuple(S), tuple(E), 3.9, 3.4, NAVY, sides=6)
    fw = Vector(W) - (Vector(W) - E).normalized() * 1.4
    m.limb(tuple(E), tuple(fw), 3.4, 2.9, NAVY, sides=6)
    m.hull(ell(tuple(E), (3.5, 3.5, 3.5), nu=6, nv=3), NAVY)
    c = H.Mesh(); c.limb(tuple(fw), tuple(Vector(W) + (Vector(W) - E).normalized() * 0.5), 3.1, 2.8, WHITE, sides=7)
    if dirv is None: dirv = tuple((Vector(W) - E).normalized())
    g, hc, frame = hand(s, tuple(W), dirv, nrm, shape)
    side = 'r' if s < 0 else 'l'
    return {'sleeve_' + side: m, 'cuff_' + side: c, 'glove_' + side: g}, E, W, (hc, frame)


def stamp_prop(W, dirv, nrm):
    """The rubber stamp in her fist (STAMP): a turned walnut knob, a brass neck, the red rubber block under it."""
    u = Vector(dirv).normalized(); n = Vector(nrm).normalized()
    down = -n                                                              # (the stamp's foot points out of her palm)
    base = Vector(W) + u * 6.0 + down * 2.6
    m = H.Mesh()
    m.hull(ell(tuple(base - down * 1.0), (1.9, 1.9, 1.9), nu=8, nv=4), WALNUT2)
    m.limb(tuple(base), tuple(base + down * 4.0), 1.0, 1.0, GOLD, sides=6)
    a = base + down * 4.0
    e1 = (u - down * u.dot(down)).normalized(); e2 = down.cross(e1)
    q = [tuple(a + e1 * i * 2.8 + e2 * j * 2.0) for i in (-1, 1) for j in (-1, 1)]
    q2 = [tuple(Vector(p) + down * 1.6) for p in q]
    m.hull(q + q2, WALNUT);
    m.hull([tuple(Vector(p) + down * 0.6) for p in q2] + q2, INKPAD)
    return m


def cyl(m, c, r, z0, z1, col, n=10, M=None):
    """An upright cylinder (centre c = x, y) from z0 to z1."""
    m.hull([(c[0] + r * math.cos(2 * math.pi * k / n), c[1] + r * math.sin(2 * math.pi * k / n), z) for k in range(n) for z in (z0, z1)], col, M)


def mug(c, full, mallows, M=None):
    """Her mug: cream enamel with a maroon band and a handle; full of cocoa with `mallows` marshmallows on top."""
    m = H.Mesh(); x, y, z = c
    cyl(m, (x, y), 3.2, z - 3.6, z + 3.6, CREAM, 12, M)
    cyl(m, (x, y), 3.26, z + 1.4, z + 2.4, MAROON, 12, M)
    m.limb((x + 3.0, y - 0.2, z + 2.0), (x + 5.0, y - 0.2, z + 0.4), 0.7, 0.7, CREAM, sides=5, M=M)
    m.limb((x + 5.0, y - 0.2, z + 0.4), (x + 3.0, y - 0.2, z - 1.8), 0.7, 0.7, CREAM, sides=5, M=M)
    if full:
        cyl(m, (x, y), 2.9, z + 3.0, z + 3.3, COCOA, 12, M)
        spots = [(-1.2, -1.0), (1.1, -1.3), (0.2, 0.6), (-1.6, 0.9), (1.5, 0.8), (-0.2, -1.9), (0.4, 1.8), (1.9, -0.2)]
        for k in range(int(mallows)):
            dx, dy = spots[k % len(spots)]
            m.box((x + dx, y + dy, z + 3.8 + 0.5 * (k // len(spots))), (1.3, 1.3, 1.2), MALLOW if k % 3 else MALLOW2, M)
    return m


def prop(name, hc, frame, p, side):
    """What she's holding in one hand (pose prop_r / prop_l): mug / cassette / magnifier / paper / printout /
    pencil / redpen, built in the hand's own frame (u = fingers, palm facing -wv). Returns a Mesh or None."""
    u, v, wv = frame; c = Vector(hc); palm = -wv
    if name == 'mug':
        return mug(tuple(c + palm * 3.8 - Vector((0, 0, 1.0))), p.get('cocoa', 0) >= 0.5, round(p.get('mallows', 0)))
    m = H.Mesh()
    if name == 'cassette':
        q = c + palm * 1.6
        e1, e2 = u, v
        pts = [tuple(q + e1 * a + e2 * b + palm * d) for a in (-2.4, 2.4) for b in (-3.6, 3.6) for d in (-0.5, 0.5)]
        m.hull(pts, PLASTIC)
        m.hull([tuple(q + e1 * a + e2 * b + palm * 0.62) for a in (-1.8, 1.0) for b in (-3.0, 3.0)] +
               [tuple(q + e1 * a + e2 * b + palm * 0.5) for a in (-1.8, 1.0) for b in (-3.0, 3.0)], (SUNNY, PINK, MINT, SKY)[int(round(p.get('tape', 0))) % 4])
        return m
    if name == 'magnifier':
        a = c + u * 3.0; b = c + u * 8.0
        m.limb(tuple(a), tuple(b), 0.8, 0.9, WALNUT2, sides=6)
        o = b + u * 3.6; n = Vector((0, -1, 0))
        e1 = (u - n * u.dot(n)).normalized(); e2 = n.cross(e1)
        ring_pts = [o + (e1 * math.cos(k * math.pi / 6) + e2 * math.sin(k * math.pi / 6)) * 3.6 for k in range(12)]
        for k in range(12): m.limb(tuple(ring_pts[k]), tuple(ring_pts[(k + 1) % 12]), 0.55, 0.55, GOLD, sides=4)
        m.hull([tuple(q + n * d) for q in [o + (e1 * math.cos(k * math.pi / 6) + e2 * math.sin(k * math.pi / 6)) * 3.1 for k in range(12)] for d in (-0.2, 0.2)], LENS)
        return m
    if name in ('paper', 'printout'):
        n = Vector((0, -1, 0)); up = Vector((0, 0, 1)); rt = Vector((1, 0, 0))
        o = c + up * (5.0 if name == 'paper' else -9.0) + rt * (side * 0)
        w, h = (5.0, 6.5) if name == 'paper' else (5.5, 13.0)
        m.hull([tuple(o + rt * a + up * b + n * d) for a in (-w, w) for b in (-h, h) for d in (-0.15, 0.15)], PAPER)
        if name == 'printout':
            for k in range(-5, 6, 2): m.box(tuple(o + up * (k * 2.2) + n * 0.25), (2 * w - 0.8, 0.1, 1.1), GRAPH)
        else:
            for k in range(-4, 5): m.box(tuple(o + up * (k * 1.3) + n * 0.25 + rt * ((k % 3) - 1) * 0.6), (2 * w - 3 - (k % 2) * 2, 0.1, 0.35), INKC)
        return m
    if name == 'pickaxe':                                                 # a plain miner's pick, the handle through her fist
        a = c - v * 4.0; b = c + v * 19.0
        m.limb(tuple(a), tuple(b), 1.0, 1.0, WALNUT2, sides=6)
        hd = [tuple(b + u * k * 1.3 - v * 0.9 * (k * k) / 36) for k in range(-7, 8)]
        for q0, q1 in zip(hd, hd[1:]): m.limb(q0, q1, 1.4, 1.4, IRON, sides=5)
        return m
    if name == 'handheld':                                                # a chunky grey handheld game
        q = c + palm * 1.8 + v * 2.0
        m.hull([tuple(q + u * a + v * b + palm * d) for a in (-3.2, 3.2) for b in (-5.2, 5.2) for d in (-0.7, 0.7)], CHROME2)
        m.hull([tuple(q + u * a + v * b + palm * 0.75) for a in (0.0, 2.8) for b in (-2.6, 2.6)] + [tuple(q + u * a + v * b + palm * 0.72) for a in (0.0, 2.8) for b in (-2.6, 2.6)], GRAPH)
        for b in (-3.8, 3.8): m.hull(ell(tuple(q - u * 1.6 + v * b + palm * 0.8), (0.7, 0.7, 0.3), nu=6, nv=3), RED)
        return m
    if name == 'binoculars':                                              # two black barrels with brass rings
        mid = c + palm * 4.6; fwd = -v
        for side_ in (-1, 1):
            o = mid + u * 0.0 + palm.cross(fwd).normalized() * 0 + (palm * side_ * 2.4)
            m.limb(tuple(o - fwd * 1.5), tuple(o + fwd * 5.5), 1.7, 2.0, PLASTIC, sides=8)
            m.limb(tuple(o + fwd * 5.2), tuple(o + fwd * 5.8), 2.1, 2.1, GOLD, sides=8)
        m.limb(tuple(mid - palm * 2.4 + fwd * 1.5), tuple(mid + palm * 2.4 + fwd * 1.5), 0.6, 0.6, CHROME2, sides=5)
        return m
    if name in ('pencil', 'redpen'):
        a = c + palm * 1.2 - u * 0.5; b = a + palm * 6.5 + u * 1.0
        m.limb(tuple(a), tuple(b), 0.45, 0.45, SUNNY if name == 'pencil' else RED, sides=6)
        m.limb(tuple(b), tuple(b + (b - a).normalized() * 1.2), 0.45, 0.1, INKC, sides=5)
        return m
    return None


def phones(M):
    """Headphones over her cap (UVB-76): a band over the crown and two padded cups on her ears."""
    m = H.Mesh()
    pts = [(math.cos(a) * 12.6, 0.4, 6 + math.sin(a) * 12.0) for a in [math.pi * k / 10 for k in range(11)]]
    for a, b in zip(pts, pts[1:]): m.limb(a, b, 0.9, 0.9, PLASTIC2, sides=5, M=M)
    for sx in (-1, 1):
        m.hull([(sx * (11.0 + d), y, z) for d in (0, 2.6) for y, z in [(3.8 * math.cos(t), -1 + 4.2 * math.sin(t)) for t in [k * math.pi / 5 for k in range(10)]]], PLASTIC, M)
        m.hull([(sx * (13.8), y, z) for y, z in [(2.2 * math.cos(t), -1 + 2.4 * math.sin(t)) for t in [k * math.pi / 4 for k in range(8)]]] +
               [(sx * 13.2, 0, -1)], RED, M)
    return m


# ------------------------------------------------------------------ poses
def V(*a): return tuple(a)

BASE = {
    'body': {'x': 0, 'y': 0, 'z': 0, 'rx': 3, 'ry': 0, 'rz': 0},
    'head': {'yaw': 0, 'pitch': 0, 'roll': 0},
    'hat': {'lift': 0, 'tilt': 0, 'back': 0, 'roll': 0},
    # hands folded on the counter: wrists (world), elbow pole, finger direction, palm normal
    'r': {'w': V(-6.5, 3, 2.2), 'pole': V(-1, 0.4, -0.4), 'dir': V(0.75, -0.55, 0), 'nrm': V(0, 0, -1), 'shape': 'flat', 'local': 0},
    'l': {'w': V(6.5, 3, 4.4), 'pole': V(1, 0.4, -0.4), 'dir': V(-0.75, -0.55, 0), 'nrm': V(0, 0, -1), 'shape': 'flat', 'local': 0},
    'stamp': 0,
    'prop_r': '', 'prop_l': '', 'cocoa': 0, 'mallows': 0, 'tape': 0, 'phones': 0, 'step': 0,
}


def merge(a, b):
    """A pose dict with b's values over a's (nested)."""
    out = dict(b)
    for k in a:
        out[k] = merge(a[k], b.get(k, {})) if isinstance(a[k], dict) else b.get(k, a[k])
    return out


def lerp(a, b, t):
    """Blends two poses (numbers and tuples; anything else switches halfway)."""
    if isinstance(a, dict): return {k: lerp(a[k], b[k], t) for k in a}
    if isinstance(a, (int, float)) and isinstance(b, (int, float)): return a + (b - a) * t
    if isinstance(a, tuple) and isinstance(b, tuple) and len(a) == len(b): return tuple(x + (y - x) * t for x, y in zip(a, b))
    return b if t >= 0.5 else a


def ease(t): return t * t * (3 - 2 * t)


# key poses: (time in seconds, pose changes over BASE). Loops end on their first key.
LEAN = {'body': {'rx': 13, 'y': -4}}
CHIN = {'body': {'rx': 20, 'y': -5, 'z': -1}, 'head': {'roll': 6, 'pitch': -6},
        'r': {'w': V(-4.6, -3.0, 27.0), 'pole': V(-0.5, 0.2, -1), 'dir': V(0.15, 0.1, 1), 'nrm': V(0.6, 0.8, 0), 'shape': 'fist'},
        'l': {'w': V(4.6, -3.0, 27.0), 'pole': V(0.5, 0.2, -1), 'dir': V(-0.15, 0.1, 1), 'nrm': V(-0.6, 0.8, 0), 'shape': 'fist'}}
WAVE_UP = {'r': {'w': V(-24, 4, 46), 'pole': V(-1, 0.5, -0.6), 'dir': V(0.05, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}}
TURNED = {'body': {'rz': -78, 'rx': 24, 'x': -8, 'y': 4, 'z': -1}, 'head': {'pitch': 12}}
ANIMS = {
    'idle': [(0, {}), (1.2, {'body': {'rx': 4.5, 'z': 0.5, 'ry': 0.8}, 'head': {'roll': 2.5, 'pitch': 1}}), (2.4, {})],
    'greet': [(0, {}), (0.3, {**WAVE_UP, 'head': {'roll': -8, 'pitch': 3}, 'body': {'ry': 3}}),
              (0.55, {'r': {'w': V(-29, 4, 44), 'dir': V(-0.4, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}, 'head': {'roll': -8}, 'body': {'ry': 3}}),
              (0.8, {'r': {'w': V(-21, 4, 47), 'dir': V(0.4, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}, 'head': {'roll': -8}, 'body': {'ry': 3}}),
              (1.05, {'r': {'w': V(-29, 4, 44), 'dir': V(-0.4, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}, 'head': {'roll': -8}, 'body': {'ry': 3}}),
              (1.3, {'r': {'w': V(-21, 4, 47), 'dir': V(0.4, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}, 'head': {'roll': -8}, 'body': {'ry': 3}}),
              (1.8, {})],
    'ask': [(0, {}), (0.5, merge(LEAN, {'head': {'roll': 9, 'pitch': 4},
                                         'r': {'w': V(-11, -3, 1.2), 'dir': V(0.3, -1, 0)}, 'l': {'w': V(11, -3, 1.2), 'dir': V(-0.3, -1, 0)}})),
            (0.9, merge(LEAN, {'head': {'roll': 7, 'pitch': 3}, 'r': {'w': V(-11, -3, 1.2), 'dir': V(0.3, -1, 0)}, 'l': {'w': V(11, -3, 1.2), 'dir': V(-0.3, -1, 0)}})),
            (1.5, CHIN)],
    'listen': [(0, CHIN), (1.3, merge(CHIN, {'head': {'roll': -5, 'pitch': -4, 'yaw': 4}, 'body': {'rx': 20, 'y': -5, 'z': -1, 'ry': -1.5}})), (2.6, CHIN)],
    'dig': [(0, {}), (0.45, {'body': {'rz': -40, 'rx': 6, 'x': -4}, 'head': {'yaw': -30}}),
            (0.9, merge(TURNED, {'r': {'w': V(-40, 44, 13), 'pole': V(0, -1, -0.4), 'dir': V(-0.3, 0.2, -1), 'nrm': V(-1, 0, 0), 'shape': 'cup'},
                                 'l': {'w': V(-38, 52, 16), 'pole': V(0, 1, -0.4), 'dir': V(-0.3, 0, -1), 'nrm': V(-1, 0, 0), 'shape': 'cup'}})),
            (1.2, merge(TURNED, {'r': {'w': V(-44, 46, 9), 'pole': V(0, -1, -0.4), 'dir': V(-0.4, 0.2, -1), 'nrm': V(-1, 0, 0), 'shape': 'cup'},
                                 'l': {'w': V(-36, 54, 18), 'pole': V(0, 1, -0.4), 'dir': V(-0.2, 0, -1), 'nrm': V(-1, 0, 0), 'shape': 'open'}, 'body': {'rz': -84}})),
            (1.5, merge(TURNED, {'r': {'w': V(-37, 45, 17), 'pole': V(0, -1, -0.4), 'dir': V(-0.2, 0.2, -1), 'nrm': V(-1, 0, 0), 'shape': 'open'},
                                 'l': {'w': V(-45, 53, 10), 'pole': V(0, 1, -0.4), 'dir': V(-0.4, 0, -1), 'nrm': V(-1, 0, 0), 'shape': 'cup'}, 'body': {'rz': -72}})),
            (1.8, merge(TURNED, {'r': {'w': V(-45, 47, 10), 'pole': V(0, -1, -0.4), 'dir': V(-0.4, 0.2, -1), 'nrm': V(-1, 0, 0), 'shape': 'cup'},
                                 'l': {'w': V(-37, 54, 17), 'pole': V(0, 1, -0.4), 'dir': V(-0.2, 0, -1), 'nrm': V(-1, 0, 0), 'shape': 'open'}, 'body': {'rz': -82}})),
            (2.1, merge(TURNED, {'r': {'w': V(-41, 46, 13), 'pole': V(0, -1, -0.4), 'dir': V(-0.3, 0.2, -1), 'nrm': V(-1, 0, 0), 'shape': 'hold'},
                                 'l': {'w': V(-39, 53, 15), 'pole': V(0, 1, -0.4), 'dir': V(-0.3, 0, -1), 'nrm': V(-1, 0, 0), 'shape': 'open'}})),
            (2.45, {'body': {'rz': -60, 'rx': 4, 'x': -5}, 'head': {'yaw': -20, 'pitch': 6},
                    'r': {'w': V(-26, 20, 38), 'pole': V(0, -1, -0.6), 'dir': V(-0.2, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'},
                    'l': {'w': V(-18, 34, 12), 'pole': V(0, 1, -0.5), 'dir': V(0, 0, -1), 'nrm': V(-1, 0, 0), 'shape': 'open'}}),
            (2.9, {'body': {'rz': -20, 'rx': 4}, 'head': {'yaw': -10},
                   'r': {'w': V(-14, 10, 30), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.3, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}}),
            (3.3, {'r': {'w': V(-14, 6, 26), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}, 'head': {'roll': 6}})],
    'give': [(0, {'r': {'w': V(-14, 6, 26), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}, 'head': {'roll': 6}}),
             (0.35, {'body': {'rx': 10, 'y': -2}, 'r': {'w': V(-8, 2, 1.6), 'pole': V(-1, 0.3, -0.2), 'dir': V(0.2, -1, 0), 'nrm': V(0, 0, -1), 'shape': 'flat'}}),
             (0.8, {'body': {'rx': 24, 'y': -7, 'z': -1}, 'head': {'pitch': 8, 'roll': 5}, 'r': {'w': V(-6, -14.5, 1.6), 'pole': V(-1, 0.3, -0.2), 'dir': V(0.2, -1, 0), 'nrm': V(0, 0, -1), 'shape': 'flat'}}),
             (1.05, {'body': {'rx': 24, 'y': -7, 'z': -1}, 'head': {'pitch': 6, 'roll': 5}, 'r': {'w': V(-6, -14.5, 1.6), 'pole': V(-1, 0.3, -0.2), 'dir': V(0.2, -1, 0), 'nrm': V(0, 0, -1), 'shape': 'flat'}}),
             (1.6, {})],
    'portal': [(0, {}), (0.4, {'body': {'rz': -18, 'ry': -3}, 'head': {'yaw': -28, 'roll': -4},
                               'r': {'w': V(-30, -4, 34), 'pole': V(-1, 0.4, -0.6), 'dir': V(-0.3, -0.4, 1), 'nrm': V(0, -1, 0), 'shape': 'point'}})] +
              [(0.55 + 0.11 * k, {'body': {'rz': -18, 'ry': -3}, 'head': {'yaw': -28, 'roll': -4},
                                  'r': {'w': V(-38 + 9 * math.cos(math.pi / 2 + 2 * math.pi * k / 10), -6, 30 + 9 * math.sin(math.pi / 2 + 2 * math.pi * k / 10)),
                                        'pole': V(-1, 0.4, -0.6), 'dir': V(-0.5, -0.6, 0.4), 'nrm': V(0, -1, 0), 'shape': 'point'}}) for k in range(11)] +
              [(1.95, {'body': {'rz': -18, 'ry': -3}, 'head': {'yaw': -28, 'roll': 4}, 'r': {'w': V(-28, -2, 28), 'pole': V(-1, 0.4, -0.6), 'dir': V(-0.8, -0.3, 0.1), 'nrm': V(0, 0, -1), 'shape': 'open'}}),
               (2.4, {'body': {'rz': -24, 'ry': -9, 'x': -3}, 'head': {'yaw': -30, 'roll': -6}, 'r': {'w': V(-46, -6, 30), 'pole': V(-0.2, 0.6, -1), 'dir': V(-1, -0.2, 0), 'nrm': V(0, 0, -1), 'shape': 'open'}}),
               (2.9, {'body': {'rz': -24, 'ry': -10, 'x': -4}, 'head': {'yaw': -30, 'roll': -8, 'pitch': -4}, 'r': {'w': V(-46, -6, 30), 'pole': V(-0.2, 0.6, -1), 'dir': V(-1, -0.2, 0), 'nrm': V(0, 0, -1), 'shape': 'fist'}}),
               (3.4, {'body': {'rz': -10, 'ry': 3}, 'head': {'yaw': -8, 'roll': 6}, 'r': {'w': V(-18, 2, 30), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}}),
               (3.9, {'r': {'w': V(-14, 6, 26), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}, 'head': {'roll': 6}})],
    'think': [(0, {}), (0.5, {'head': {'yaw': 14, 'pitch': -12, 'roll': 8}, 'body': {'rx': 1},
                              'r': {'w': V(-2.5, -8, 33), 'pole': V(-0.6, 0.3, -1), 'dir': V(0.3, 0, 1), 'nrm': V(0.7, 0.7, 0), 'shape': 'point'},
                              'l': {'w': V(-3, 0, 17), 'pole': V(1, 0, -0.6), 'dir': V(-1, -0.1, 0.1), 'nrm': V(0, 0, -1), 'shape': 'flat'}}),
              (1.3, {'head': {'yaw': 18, 'pitch': -15, 'roll': 10}, 'body': {'rx': 1},
                     'r': {'w': V(-2.5, -8.4, 33.6), 'pole': V(-0.6, 0.3, -1), 'dir': V(0.3, 0, 1), 'nrm': V(0.7, 0.7, 0), 'shape': 'point'},
                     'l': {'w': V(-3, 0, 17), 'pole': V(1, 0, -0.6), 'dir': V(-1, -0.1, 0.1), 'nrm': V(0, 0, -1), 'shape': 'flat'}}),
              (2.0, {'head': {'yaw': 14, 'pitch': -12, 'roll': 8}, 'body': {'rx': 1},
                     'r': {'w': V(-2.5, -8, 33), 'pole': V(-0.6, 0.3, -1), 'dir': V(0.3, 0, 1), 'nrm': V(0.7, 0.7, 0), 'shape': 'point'},
                     'l': {'w': V(-3, 0, 17), 'pole': V(1, 0, -0.6), 'dir': V(-1, -0.1, 0.1), 'nrm': V(0, 0, -1), 'shape': 'flat'}}),
              (2.5, {})],
    'laugh': [(0, {})] + [(0.15 + 0.22 * k, {'body': {'rx': -6 + (k % 2) * 4, 'z': (k % 2) * 1.2}, 'head': {'pitch': -14 + (k % 2) * 6, 'roll': -4},
                                              'r': {'w': V(-3, -9, 35 - (k % 2) * 2), 'pole': V(-1, 0.3, -1), 'dir': V(0.4, 0, 1), 'nrm': V(0.4, 0.9, 0), 'shape': 'cup'},
                                              'l': {'w': V(12, -2, 6 + (k % 2) * 2), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.4, -0.6, 0.6), 'nrm': V(-0.5, 0.5, -0.5), 'shape': 'open'}}) for k in range(6)] + [(1.9, {})],
    'shrug': [(0, {}), (0.4, {'body': {'z': 1.6}, 'head': {'roll': 12, 'pitch': 2},
                              'r': {'w': V(-26, -6, 22), 'pole': V(-0.3, 0.5, -1), 'dir': V(-0.6, -0.3, 0.6), 'nrm': V(0, 0, 1), 'shape': 'open'},
                              'l': {'w': V(26, -6, 22), 'pole': V(0.3, 0.5, -1), 'dir': V(0.6, -0.3, 0.6), 'nrm': V(0, 0, 1), 'shape': 'open'}}),
              (1.0, {'body': {'z': 1.8}, 'head': {'roll': 13, 'pitch': 3},
                     'r': {'w': V(-27, -6, 23), 'pole': V(-0.3, 0.5, -1), 'dir': V(-0.6, -0.3, 0.6), 'nrm': V(0, 0, 1), 'shape': 'open'},
                     'l': {'w': V(27, -6, 23), 'pole': V(0.3, 0.5, -1), 'dir': V(0.6, -0.3, 0.6), 'nrm': V(0, 0, 1), 'shape': 'open'}}),
              (1.5, {})],
    'stamp': [(0, {}), (0.3, {'stamp': 1, 'r': {'w': V(-22, -1, 4), 'pole': V(-1, 0.3, -0.5), 'dir': V(0.3, -0.2, 0.9), 'nrm': V(1, 0, 0), 'shape': 'fist'}}),
              (0.75, {'stamp': 1, 'body': {'rx': -2}, 'head': {'pitch': -8, 'roll': -6}, 'r': {'w': V(-22, -4, 34), 'pole': V(-1, 0.3, -0.5), 'dir': V(0.3, -0.2, 0.9), 'nrm': V(1, 0, 0), 'shape': 'fist'}}),
              (0.95, {'stamp': 1, 'body': {'rx': 14, 'y': -3}, 'head': {'pitch': 10, 'roll': 4}, 'r': {'w': V(-22, -4, 10.2), 'pole': V(-1, 0.3, -0.5), 'dir': V(0.3, -0.2, 0.9), 'nrm': V(1, 0, 0), 'shape': 'fist'}}),
              (1.3, {'stamp': 1, 'body': {'rx': 12, 'y': -3}, 'head': {'pitch': 8, 'roll': 4}, 'r': {'w': V(-22, -4, 10.6), 'pole': V(-1, 0.3, -0.5), 'dir': V(0.3, -0.2, 0.9), 'nrm': V(1, 0, 0), 'shape': 'fist'}}),
              (1.6, {'stamp': 1, 'r': {'w': V(-22, -1, 4), 'pole': V(-1, 0.3, -0.5), 'dir': V(0.3, -0.2, 0.9), 'nrm': V(1, 0, 0), 'shape': 'fist'}}), (1.9, {})],
    'tip': [(0, {}), (0.4, {'r': {'w': V(-11, -9, 54), 'pole': V(-1, 0, -0.6), 'dir': V(1, 0, 0.2), 'nrm': V(0, 0.5, -1), 'shape': 'cup'}}),
            (0.75, {'hat': {'lift': 6, 'tilt': -24, 'back': -2}, 'head': {'pitch': 10, 'roll': -6}, 'body': {'rx': 10},
                    'r': {'w': V(-11, -15, 60), 'pole': V(-1, 0, -0.6), 'dir': V(1, 0, 0.2), 'nrm': V(0, 0.5, -1), 'shape': 'hold'}}),
            (1.15, {'hat': {'lift': 6, 'tilt': -24, 'back': -2}, 'head': {'pitch': 10, 'roll': -6}, 'body': {'rx': 10},
                    'r': {'w': V(-11, -15, 60), 'pole': V(-1, 0, -0.6), 'dir': V(1, 0, 0.2), 'nrm': V(0, 0.5, -1), 'shape': 'hold'}}),
            (1.45, {'r': {'w': V(-11, -9, 54), 'pole': V(-1, 0, -0.6), 'dir': V(1, 0, 0.2), 'nrm': V(0, 0.5, -1), 'shape': 'cup'}}), (1.9, {})],
    'explain': [(0, {}), (0.4, {'head': {'roll': -5, 'yaw': 5}, 'l': {'w': V(17, -8, 22), 'pole': V(1, 0.4, -1), 'dir': V(0.3, -0.5, 0.8), 'nrm': V(-0.4, -0.3, 0.8), 'shape': 'open'}}),
                (0.9, {'head': {'roll': 4, 'yaw': -4}, 'l': {'w': V(21, -10, 18), 'pole': V(1, 0.4, -1), 'dir': V(0.6, -0.5, 0.6), 'nrm': V(-0.2, -0.3, 0.9), 'shape': 'open'}}),
                (1.4, {'head': {'roll': -5, 'yaw': 5}, 'l': {'w': V(17, -8, 22), 'pole': V(1, 0.4, -1), 'dir': V(0.3, -0.5, 0.8), 'nrm': V(-0.4, -0.3, 0.8), 'shape': 'open'}}),
                (1.9, {})],
}
LOOPS = {'idle', 'listen'}
# frames the game acts on: the papers fly while she rummages; her hand lets go of the folder; the stamp lands; the
# portal opens / she reaches in / pulls out; the hat's off
EVENTS = {'dig': {'rummage': (0.9, 2.1), 'grab': 2.1}, 'give': {'slide': (0.35, 0.8), 'release': 1.05},
          'stamp': {'hit': 0.95}, 'portal': {'draw': (0.55, 1.65), 'open': 1.65, 'reach': 2.4, 'grab': 2.9, 'out': 3.4},
          'tip': {'off': 0.75}, 'greet': {}}

# ---- the cocoa break, the tape change, and the five mysteries
TURN_R = {'body': {'rz': 128, 'rx': 8, 'x': 6, 'y': 4}, 'head': {'pitch': 10, 'yaw': -6}}
TURN_L = {'body': {'rz': -76, 'rx': 8, 'x': -9, 'y': 4}, 'head': {'pitch': -12}}
MUG_L = lambda w, extra=None: {'w': w, 'pole': V(1, 0.2, -0.6), 'dir': V(0, 0.2, 1), 'nrm': V(-1, 0, 0), 'shape': 'hold'}


def KP(base, **kw):
    """A key pose: base changes with more on top (each kw value a dict merged into that part)."""
    out = {k: (dict(v) if isinstance(v, dict) else v) for k, v in base.items()}
    for k, v in kw.items(): out[k] = {**out.get(k, {}), **v} if isinstance(v, dict) else v
    return out


R_REST = {'w': V(-6.5, 3, 2.2), 'pole': V(-1, 0.4, -0.4), 'dir': V(0.75, -0.55, 0), 'nrm': V(0, 0, -1), 'shape': 'flat'}
COCOA_HOLD = dict(prop_l='mug', cocoa=1)
def _cocoa():
    """THE COCOA BREAK (~11 s): mug off the tree, under the nozzle, button, pour (she hums), marshmallows from the jar
    one at a time, two sips facing you, the empty mug back on its hook."""
    k = [(0, {}),
         (0.6, KP(TURN_R, l={'w': V(38, 40, 18), 'pole': V(1, 0, -0.5), 'dir': V(1, 0.4, 0), 'nrm': V(0, 1, 0), 'shape': 'open'})),
         (1.0, KP(TURN_R, l=MUG_L(V(39, 41, 14)), prop_l='mug')),
         (1.5, KP(TURN_R, l=MUG_L(V(29, 39, 7.5)), prop_l='mug')),
         (1.9, KP(TURN_R, l=MUG_L(V(29, 39, 7.5)), prop_l='mug', r={'w': V(34, 37, 22.5), 'pole': V(-0.2, -1, -0.6), 'dir': V(0.6, 0.8, 0), 'nrm': V(0, 0, -1), 'shape': 'point'})),
         (2.3, KP(TURN_R, l=MUG_L(V(29, 39, 7.5)), prop_l='mug', r={'w': V(20, 22, 10), 'pole': V(-0.2, -1, -0.6), 'dir': V(0.6, 0.6, -0.4), 'nrm': V(0, 0, -1), 'shape': 'open'}))]
    for i, t in enumerate((2.8, 3.3, 3.8, 4.2)):
        k.append((t, KP(TURN_R, l=MUG_L(V(29, 39, 7.5)), prop_l='mug', cocoa=1 if t > 3 else 0,
                        r={'w': V(20, 22, 10), 'pole': V(-0.2, -1, -0.6), 'dir': V(0.6, 0.6, -0.4), 'nrm': V(0, 0, -1), 'shape': 'open'},
                        head={'pitch': 8, 'roll': 7 if i % 2 == 0 else -7})))
    k.append((4.6, KP(TURN_R, l=MUG_L(V(22, 34, 13)), **COCOA_HOLD, r={'w': V(14, 30, 14), 'pole': V(-0.2, -1, -0.6), 'dir': V(0.4, 0.8, 0), 'nrm': V(0, 0, -1), 'shape': 'open'})))
    n = 0
    for t in (5.0, 5.6, 6.2):
        k.append((t, KP(TURN_R, l=MUG_L(V(22, 34, 13)), **COCOA_HOLD, mallows=n, r={'w': V(17, 40, 16), 'pole': V(-0.2, -1, -0.6), 'dir': V(0.3, 0.4, -1), 'nrm': V(0, 1, 0), 'shape': 'cup'})))
        n += 2
        k.append((t + 0.3, KP(TURN_R, l=MUG_L(V(22, 34, 13)), **COCOA_HOLD, mallows=n, r={'w': V(22, 30, 22), 'pole': V(-0.2, -1, -0.6), 'dir': V(0.3, 0.2, -1), 'nrm': V(0, 1, 0), 'shape': 'open'}, head={'pitch': 14, 'roll': 4})))
    SIP = lambda m, extra=None: {'l': MUG_L(V(5, 13, 35)), **COCOA_HOLD, 'mallows': m, **(extra or {})}
    HOLD = lambda m, extra=None: {'l': MUG_L(V(10, 6, 23)), 'r': {'w': V(-2, 2, 21), 'pole': V(-1, 0.3, -0.6), 'dir': V(1, 0, 0.3), 'nrm': V(0, 1, 0), 'shape': 'cup'}, **COCOA_HOLD, 'mallows': m, **(extra or {})}
    k += [(7.0, HOLD(6, {'head': {'roll': 6}})),
          (7.6, SIP(6, {'head': {'pitch': -10, 'roll': 3}})), (8.3, SIP(6, {'head': {'pitch': -14, 'roll': 3}})),
          (8.9, HOLD(5, {'head': {'roll': -8, 'pitch': 2}})), (9.6, HOLD(5, {'head': {'roll': 8, 'pitch': 4}, 'body': {'ry': 2}})),
          (10.2, HOLD(5, {'head': {'roll': -6, 'pitch': 4}, 'body': {'ry': -2}})),
          (10.8, {'l': MUG_L(V(5, 11, 32)), **COCOA_HOLD, 'mallows': 5, 'head': {'pitch': 2}}),          # she blows on it
          (11.4, {'l': MUG_L(V(5, 11, 32)), **COCOA_HOLD, 'mallows': 5, 'head': {'pitch': 3}}),
          (12.0, SIP(5, {'head': {'pitch': -12}})), (12.7, SIP(3, {'head': {'pitch': -15}})),
          (13.3, HOLD(3, {'head': {'roll': 7}, 'body': {'ry': 2}})), (14.0, HOLD(3, {'head': {'roll': -7}, 'body': {'ry': -2}})),
          (14.7, HOLD(3, {'head': {'roll': 5}})),
          (15.3, SIP(3, {'head': {'pitch': -14}})), (16.1, SIP(0, {'head': {'pitch': -20}})),
          (16.7, {'l': MUG_L(V(11, 6, 22)), 'prop_l': 'mug', 'head': {'roll': 6}}),
          (17.4, KP(TURN_R, l=MUG_L(V(39, 41, 14)), prop_l='mug')),
          (17.8, KP(TURN_R, l={'w': V(36, 38, 17), 'pole': V(1, 0, -0.5), 'dir': V(1, 0.4, 0), 'nrm': V(0, 1, 0), 'shape': 'open'})),
          (18.5, {})]
    return k


def _tape():
    """THE TAPE CHANGE (~6 s): eject, the old tape onto the shelf, a new one in, PLAY, a little dance, finger guns."""
    def r(w, shape='point', d=V(-1, 0.3, -0.2)): return {'w': w, 'pole': V(0, -1, -0.6), 'dir': d, 'nrm': V(0, 0, -1) if shape == 'point' else V(0, 1, 0), 'shape': shape}
    k = [(0, {}), (0.5, KP(TURN_L)),
         (1.0, KP(TURN_L, r=r(V(-38, 46, 55.5), d=V(-0.6, 0.3, -0.8)))),
         (1.5, KP(TURN_L, r=r(V(-39, 43, 46), 'hold', V(-1, 0.2, 0)), prop_r='cassette', tape=0)),
         (2.1, KP(TURN_L, r=r(V(-25, 46, 45), 'hold', V(0, 0.6, -0.8)), prop_r='cassette', tape=0)),
         (2.6, KP(TURN_L, r=r(V(-27, 46, 45), 'hold', V(0, 0.6, -0.8)), prop_r='cassette', tape=1)),
         (3.2, KP(TURN_L, r=r(V(-39, 43, 46), 'hold', V(-1, 0.2, 0)), prop_r='cassette', tape=1)),
         (3.6, KP(TURN_L, r=r(V(-40, 46, 56), d=V(-0.6, 0.3, -0.8)))),
         (4.0, KP(TURN_L, head={'roll': 10, 'pitch': -4}, body={'ry': 3}))]
    for i, t in enumerate((4.35, 4.7, 5.05)):
        k.append((t, KP(TURN_L, head={'roll': -10 if i % 2 == 0 else 10, 'pitch': -4}, body={'ry': -3 if i % 2 == 0 else 3, 'z': 1 if i % 2 == 0 else 0})))
    k += [(5.6, {'head': {'roll': -6}, 'r': {'w': V(-16, -10, 22), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.2, -1, 0.2), 'nrm': V(0, 0, -1), 'shape': 'point'},
                 'l': {'w': V(16, -10, 22), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.2, -1, 0.2), 'nrm': V(0, 0, -1), 'shape': 'point'}}),
          (6.2, {'head': {'roll': -6}, 'r': {'w': V(-15, -10, 24), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.2, -1, 0.4), 'nrm': V(0, 0, -1), 'shape': 'point'},
                 'l': {'w': V(15, -10, 24), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.2, -1, 0.4), 'nrm': V(0, 0, -1), 'shape': 'point'}}),
          (6.8, {})]
    return k


UNDER = {'r': {'w': V(-12, 2, -7), 'pole': V(-1, 0, -0.5), 'dir': V(0, -0.3, -1), 'nrm': V(1, 0, 0), 'shape': 'open'},
         'l': {'w': V(12, 2, -7), 'pole': V(1, 0, -0.5), 'dir': V(0, -0.3, -1), 'nrm': V(-1, 0, 0), 'shape': 'open'}, 'body': {'rx': 18, 'y': -2}}
PAPER_L = lambda w: {'w': w, 'pole': V(1, 0.3, -0.6), 'dir': V(-0.3, 0, 1), 'nrm': V(0, 1, 0), 'shape': 'hold'}
GLASS_R = lambda w: {'w': w, 'pole': V(-1, 0.3, -0.6), 'dir': V(0.6, -0.4, 0.5), 'nrm': V(0, 0, -1), 'shape': 'fist'}
def _cipher():
    """CICADA 3301: magnifying glass and a page of code from under the counter, she peers... a cicada lands on her hat."""
    return [(0, {}), (0.4, UNDER),
            (0.9, {'l': PAPER_L(V(8, -8, 22)), 'r': GLASS_R(V(-10, -6, 22)), 'prop_l': 'paper', 'prop_r': 'magnifier', 'body': {'rx': 10}, 'head': {'pitch': 12}}),
            (1.6, {'l': PAPER_L(V(8, -9, 22)), 'r': GLASS_R(V(-8, -10, 24)), 'prop_l': 'paper', 'prop_r': 'magnifier', 'body': {'rx': 16, 'y': -3}, 'head': {'pitch': 14, 'yaw': 6}}),
            (2.2, {'l': PAPER_L(V(8, -9, 22)), 'r': GLASS_R(V(-3, -10, 22)), 'prop_l': 'paper', 'prop_r': 'magnifier', 'body': {'rx': 16, 'y': -3}, 'head': {'pitch': 16, 'yaw': -4}}),
            (2.7, {'l': PAPER_L(V(9, -6, 20)), 'r': GLASS_R(V(-10, -4, 20)), 'prop_l': 'paper', 'prop_r': 'magnifier', 'body': {'rx': -4}, 'head': {'pitch': -18}}),
            (3.7, {'l': PAPER_L(V(9, -6, 20)), 'r': GLASS_R(V(-10, -4, 20)), 'prop_l': 'paper', 'prop_r': 'magnifier', 'body': {'rx': -3}, 'head': {'pitch': -20, 'roll': 6}}),
            (4.2, UNDER), (4.8, {})]


GRIP = {'r': {'w': V(-11, -11, 1.2), 'pole': V(-1, 0.3, -0.4), 'dir': V(0, -1, -0.5), 'nrm': V(0, 0, -1), 'shape': 'cup'},
        'l': {'w': V(11, -11, 1.2), 'pole': V(1, 0.3, -0.4), 'dir': V(0, -1, -0.5), 'nrm': V(0, 0, -1), 'shape': 'cup'}}
def _dizzy():
    """POLYBIUS: she grips the counter and stares into the screen... then her head goes round and round."""
    k = [(0, {}), (0.6, KP(GRIP, body={'rx': 16, 'y': -4}, head={'pitch': 4})), (2.2, KP(GRIP, body={'rx': 18, 'y': -5}, head={'pitch': 6}))]
    for i in range(7):
        a = i * 1.1
        k.append((2.5 + i * 0.3, {'body': {'ry': 7 * math.sin(a), 'x': 2 * math.sin(a)}, 'head': {'roll': 13 * math.sin(a + 1), 'yaw': 10 * math.cos(a), 'pitch': -4},
                                   'r': {'w': V(-19, -2, 14 + 3 * math.sin(a)), 'pole': V(-1, 0.3, -0.6), 'dir': V(-0.3, -0.5, 0.8), 'nrm': V(0, -0.3, -1), 'shape': 'open'},
                                   'l': {'w': V(19, -2, 14 - 3 * math.sin(a)), 'pole': V(1, 0.3, -0.6), 'dir': V(0.3, -0.5, 0.8), 'nrm': V(0, -0.3, -1), 'shape': 'open'}}))
    k += [(4.8, {'head': {'yaw': 18}}), (5.0, {'head': {'yaw': -18}}), (5.2, {'head': {'yaw': 14}}), (5.4, {'head': {'yaw': -8}}), (5.9, {})]
    return k


EAR_R = {'w': V(-13, 14, 44), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.2, 0, 1), 'nrm': V(1, 0, 0), 'shape': 'cup'}
EAR_L = {'w': V(13, 14, 44), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.2, 0, 1), 'nrm': V(-1, 0, 0), 'shape': 'cup'}
def _radio():
    """UVB-76: headphones on, a hand pressed to one ear, she scribbles down what she hears."""
    def wr(x): return {'w': V(x, -6, 1.8), 'pole': V(-1, 0.3, -0.3), 'dir': V(0.3, -1, 0), 'nrm': V(0, 0, -1), 'shape': 'fist'}
    k = [(0, {}), (0.6, {'r': EAR_R, 'l': EAR_L, 'head': {'pitch': 4}}), (0.8, {'r': EAR_R, 'l': EAR_L, 'phones': 1}),
         (1.2, {'r': wr(-8), 'l': EAR_L, 'phones': 1, 'prop_r': 'pencil', 'head': {'roll': 12, 'pitch': 8}, 'body': {'rx': 8}})]
    for i in range(8):
        k.append((1.5 + i * 0.3, {'r': wr(-8 + (3 if i % 2 else -2)), 'l': EAR_L, 'phones': 1, 'prop_r': 'pencil', 'head': {'roll': 12 + (3 if i % 3 == 0 else 0), 'pitch': 9}, 'body': {'rx': 8}}))
    k += [(4.2, {'r': EAR_R, 'l': EAR_L, 'phones': 1, 'head': {'roll': -4}}), (4.5, {'r': EAR_R, 'l': EAR_L, 'phones': 0}), (5.2, {})]
    return k


GRIP_LOW = {'r': {'w': V(-10, -11, 0.4), 'pole': V(-1, 0, -0.3), 'dir': V(0, -1, -0.7), 'nrm': V(0, 0, -1), 'shape': 'cup'},
            'l': {'w': V(10, -11, 0.4), 'pole': V(1, 0, -0.3), 'dir': V(0, -1, -0.7), 'nrm': V(0, 0, -1), 'shape': 'cup'}}
def _spook():
    """THE RAKE: she slowly looks to the dark corner... freezes... whips back and ducks behind the counter, peeking."""
    return [(0, {}), (1.0, {'head': {'yaw': 46, 'pitch': 2}, 'body': {'rz': 10}}), (1.9, {'head': {'yaw': 52, 'pitch': 4}, 'body': {'rz': 12}}),
            (2.3, {'head': {'yaw': 0, 'pitch': -4}, 'body': {'rx': -6, 'z': 1},
                   'r': {'w': V(-9, -8, 34), 'pole': V(-1, 0.3, -1), 'dir': V(0.2, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'},
                   'l': {'w': V(9, -8, 34), 'pole': V(1, 0.3, -1), 'dir': V(-0.2, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}}),
            (2.8, KP(GRIP_LOW, body={'z': -42, 'rx': 6, 'y': -2})),
            (4.0, KP(GRIP_LOW, body={'z': -40, 'rx': 6, 'y': -2}, head={'yaw': 22, 'pitch': 2})),
            (4.8, KP(GRIP_LOW, body={'z': -40, 'rx': 6, 'y': -2}, head={'yaw': -10})),
            (5.6, KP(GRIP_LOW, body={'z': -14, 'rx': 4})), (6.3, {})]


def _wow():
    """THE WOW! SIGNAL: a long printout, she runs a red pen down it, circles something... and throws her arms up. WOW!"""
    pr = {'w': V(12, -7, 36), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.4, 0, 1), 'nrm': V(0, 1, 0), 'shape': 'hold'}
    def pen(x, z): return {'w': V(x, -11, z), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.3, -0.3, 0.8), 'nrm': V(0.3, 0.8, 0.3), 'shape': 'fist'}
    k = [(0, {}), (0.4, UNDER), (1.0, {'l': pr, 'r': pen(2, 30), 'prop_l': 'printout', 'prop_r': 'redpen', 'head': {'pitch': 12}, 'body': {'rx': 6}})]
    for i in range(9):
        a = 2 * math.pi * i / 8
        k.append((1.4 + i * 0.15, {'l': pr, 'r': pen(3 + 2.6 * math.cos(a), 26 + 2.2 * math.sin(a)), 'prop_l': 'printout', 'prop_r': 'redpen', 'head': {'pitch': 14}, 'body': {'rx': 8}}))
    k += [(2.9, {'l': pr, 'r': pen(5, 26), 'prop_l': 'printout', 'prop_r': 'redpen', 'head': {'pitch': 10, 'roll': 6}, 'body': {'rx': 6}}),
          (3.2, {'body': {'rx': -8, 'z': 2.5}, 'head': {'pitch': -12},
                 'r': {'w': V(-22, 0, 58), 'pole': V(-1, 0.3, -0.4), 'dir': V(-0.2, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'},
                 'l': {'w': V(22, 0, 58), 'pole': V(1, 0.3, -0.4), 'dir': V(0.2, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}}),
          (3.9, {'body': {'rx': -6, 'z': 2}, 'head': {'pitch': -10, 'roll': 6},
                 'r': {'w': V(-24, 0, 56), 'pole': V(-1, 0.3, -0.4), 'dir': V(-0.3, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'},
                 'l': {'w': V(24, 0, 56), 'pole': V(1, 0.3, -0.4), 'dir': V(0.3, 0, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}}),
          (4.7, {})]
    return k


ANIMS.update({'cocoa': _cocoa(), 'tape': _tape(), 'cipher': _cipher(), 'dizzy': _dizzy(), 'radio': _radio(), 'spook': _spook(), 'wow': _wow()})
EVENTS.update({'cocoa': {'press': 1.9, 'pour': (2.2, 4.3), 'drop1': 5.3, 'drop2': 5.9, 'drop3': 6.5, 'sip': (7.5, 8.4), 'blow': (10.8, 11.5), 'sip2': (12.0, 12.8), 'sip3': (15.3, 16.2), 'steam': (4.4, 16.6)},
               'tape': {'eject': 1.0, 'play': 3.6, 'dance': (4.0, 5.3), 'done': 5.6},
               'cipher': {'paper': (0.9, 4.1), 'land': 2.6},
               'dizzy': {'stare': (0.6, 2.4), 'dizzy': (2.4, 4.8)},
               'radio': {'buzz': (1.0, 4.2)},
               'spook': {'see': 1.5, 'duck': 2.8, 'peek': (2.8, 5.5)},
               'wow': {'circle': (1.4, 2.6), 'wow': 3.2}})


# ---- the back door (the CONFIDENTIAL files) and five video game legends
def HANG(sw, side):
    """An arm hanging at her side while she walks (on her body: 'local'), swinging by sw (-1..1)."""
    s_ = -1 if side == 'r' else 1
    return {'w': V(s_ * 15.5, 2 - 6 * sw * s_, -3 + abs(sw) * 1.5), 'pole': V(s_ * 0.3, 1, 0), 'dir': V(0, -0.15 * sw * s_, -1), 'nrm': V(-s_, 0, 0), 'shape': 'cup', 'local': 1}


def walk(t0, t1, y0, y1, x0, x1, rz, st0, st1, extra=None):
    """Walking keys every two frames from t0 to t1 (y / x on her body's offset, step st0 -> st1, arms swinging)."""
    out, n = [], max(2, int((t1 - t0) * FPS / 2))
    for i in range(n + 1):
        f = i / n; st = st0 + (st1 - st0) * f; sw = math.sin(2 * math.pi * st)
        bob = abs(math.sin(2 * math.pi * st)) * 0.8
        kp = {'body': {'y': y0 + (y1 - y0) * f, 'x': x0 + (x1 - x0) * f, 'rz': rz, 'z': bob, 'rx': 2, 'ry': sw * 2},
              'step': st, 'r': HANG(sw, 'r'), 'l': HANG(sw, 'l'), 'head': {'roll': -sw * 2}}
        if extra: kp = KP(kp, **extra(f))
        out.append((t0 + (t1 - t0) * f, kp))
    return out


SNAP_R = lambda shape: {'w': V(-16, -8, 38), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.3, -0.2, 1), 'nrm': V(1, 0, 0), 'shape': shape}
def _door_go():
    """THE BACK DOOR: she snaps (a door appears in the wall behind her), turns and walks to it, and goes through."""
    k = [(0, {}), (0.35, {'r': SNAP_R('fist'), 'head': {'roll': -6}}), (0.55, {'r': SNAP_R('point'), 'head': {'roll': -8}}),
         (0.8, {'r': SNAP_R('open'), 'head': {'roll': -4}}),
         (1.15, {'body': {'rz': 90, 'rx': 2}, 'r': HANG(0, 'r'), 'l': HANG(0, 'l'), 'head': {'yaw': -55}}),
         (1.5, {'body': {'rz': 180, 'rx': 2}, 'r': HANG(0, 'r'), 'l': HANG(0, 'l'), 'head': {'yaw': -25}})]
    return k + walk(1.6, 4.1, 0, 76, 0, -8, 180, 0, 4.0)


def _door_back():
    """Out of the back door with a red folder: she walks to the counter, snaps over her shoulder - the door's gone."""
    snapl = lambda shape: {'w': V(16, -6, 41), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.3, -0.2, 1), 'nrm': V(-1, 0, 0), 'shape': shape, 'local': 1}
    held = {'w': V(-13, -6, 14), 'pole': V(-0.3, 1, 0), 'dir': V(0.2, -0.3, 1), 'nrm': V(0, -1, 0), 'shape': 'hold', 'local': 1}
    def ex(f):
        e = {'r': held}
        if 0.22 < f < 0.45: e['l'] = snapl('fist' if f < 0.33 else 'point'); e['head'] = {'yaw': 40, 'roll': 6}
        return e
    k = walk(0, 2.7, 76, 0, -8, 0, 0, 0, 4.0, ex)
    k += [(3.1, {'r': {'w': V(-14, 6, 26), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}, 'head': {'roll': 6}})]
    return k


PICK = lambda w: {'w': w, 'pole': V(-1, 0.3, -0.6), 'dir': V(0.2, -0.4, 0.9), 'nrm': V(1, 0, 0), 'shape': 'fist'}
def _mine():
    """HEROBRINE: she digs out a pickaxe and taps the counter, block by block... then looks at the dark corner."""
    k = [(0, {}), (0.4, UNDER), (0.8, {'r': PICK(V(-16, -4, 30)), 'prop_r': 'pickaxe', 'head': {'pitch': 6}})]
    for i, t in enumerate((1.1, 1.4, 1.7, 2.0, 2.3)):
        k.append((t, {'r': PICK(V(-12, -8, 6) if i % 2 == 0 else V(-16, -4, 30)), 'prop_r': 'pickaxe', 'body': {'rx': 12 if i % 2 == 0 else 4}, 'head': {'pitch': 10}}))
    k += [(2.9, {'r': PICK(V(-12, -8, 8)), 'prop_r': 'pickaxe', 'body': {'rx': 8}, 'head': {'yaw': 50, 'pitch': 2}}),
          (3.8, {'r': PICK(V(-12, -8, 8)), 'prop_r': 'pickaxe', 'body': {'rx': 8}, 'head': {'yaw': 54, 'pitch': 4}}),
          (4.2, {'r': PICK(V(-12, -8, 8)), 'prop_r': 'pickaxe', 'head': {'yaw': 0, 'pitch': -4}}), (4.7, UNDER), (5.2, {})]
    return k


def _handheld():
    """KILLSWITCH: a handheld game, thumbs going... DELETING. She shakes it. Nothing."""
    def hold(jr=0, jl=0, z=20, x=0): return {'r': {'w': V(-5 + x, -11, z + jr), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.3, 0, 1), 'nrm': V(0, 1, 0), 'shape': 'hold'},
                                       'l': {'w': V(5 + x, -11, z + jl), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.3, 0, 1), 'nrm': V(0, 1, 0), 'shape': 'hold'}, 'prop_r': 'handheld', 'head': {'pitch': 14}, 'body': {'rx': 8}}
    k = [(0, {}), (0.4, UNDER), (0.9, hold())]
    for i in range(9): k.append((1.1 + i * 0.22, hold(0.8 if i % 2 else 0, 0 if i % 2 else 0.8)))
    k += [(3.1, hold()), (3.35, hold(x=-3)), (3.55, hold(x=3)), (3.75, hold(x=-3)), (3.95, hold(x=2)),
          (4.4, KP(hold(z=30), head={'pitch': 0, 'roll': 10})), (4.9, UNDER), (5.4, {})]
    return k


def _ears():
    """LAVENDER: the melody gets into her head - hands over her ears, eyes shut, swaying."""
    k = [(0, {})]
    for i, t in enumerate((0.5, 1.2, 1.9, 2.6, 3.3, 4.0)):
        k.append((t, {'r': EAR_R, 'l': EAR_L, 'body': {'ry': 4 if i % 2 else -4, 'x': 1.5 if i % 2 else -1.5, 'z': -1}, 'head': {'roll': 10 if i % 2 else -10, 'pitch': 6}}))
    k += [(4.4, {'head': {'yaw': 16}}), (4.6, {'head': {'yaw': -16}}), (4.8, {'head': {'yaw': 10}}), (5.3, {})]
    return k


def _push():
    """THE TRUCK: palms on a little truck on the counter, she pushes with everything she's got... it won't budge."""
    def p_(j=0): return {'r': {'w': V(-6 + j, -12, 3.5), 'pole': V(-1, 0.6, -0.3), 'dir': V(0.1, -0.3, 1), 'nrm': V(0, -1, 0), 'shape': 'flat'},
                         'l': {'w': V(6 + j, -12, 3.5), 'pole': V(1, 0.6, -0.3), 'dir': V(-0.1, -0.3, 1), 'nrm': V(0, -1, 0), 'shape': 'flat'},
                         'body': {'rx': 24, 'y': -6, 'z': -1}, 'head': {'pitch': -4}}
    k = [(0, {}), (0.6, p_())]
    for i in range(8): k.append((0.85 + i * 0.28, KP(p_(0.6 if i % 2 else -0.6), body={'rx': 25 if i % 2 else 23, 'y': -6.5 if i % 2 else -6, 'z': -1})))
    k += [(3.3, {'r': {'w': V(-5, -6, 47), 'pole': V(-1, 0.3, -0.6), 'dir': V(1, 0, 0.2), 'nrm': V(0, -1, 0), 'shape': 'flat'}, 'body': {'rx': -3}, 'head': {'pitch': -6}}),
          (3.8, {'r': {'w': V(4, -6, 47), 'pole': V(-1, 0.3, -0.6), 'dir': V(1, 0, 0.2), 'nrm': V(0, -1, 0), 'shape': 'flat'}, 'body': {'rx': -3}, 'head': {'pitch': -6}}),
          (4.4, {})]
    return k


def _binoculars():
    """BIGFOOT: binoculars up, she sweeps the far woods slowly... stops... there."""
    def b_(rz, pitch=0): return {'r': {'w': V(-5, -13, 46), 'pole': V(-1, 0.3, -0.6), 'dir': V(0, 0, 1), 'nrm': V(1, 0, 0), 'shape': 'hold', 'local': 1},
                                 'l': {'w': V(5, -13, 46), 'pole': V(1, 0.3, -0.6), 'dir': V(0, 0, 1), 'nrm': V(-1, 0, 0), 'shape': 'hold', 'local': 1},
                                 'prop_r': 'binoculars', 'body': {'rz': rz}, 'head': {'pitch': pitch}}
    return [(0, {}), (0.4, UNDER), (0.9, b_(-22)), (1.8, b_(-8)), (2.6, b_(10)), (3.4, b_(12, 2)), (3.8, b_(12, 2)),
            (4.2, {'body': {'rz': 10}, 'head': {'yaw': 0}}), (4.9, {})]


ANIMS.update({'door_go': _door_go(), 'door_back': _door_back(), 'mine': _mine(), 'handheld': _handheld(), 'ears': _ears(), 'push': _push(), 'binoculars': _binoculars()})
EVENTS.update({'door_go': {'snap': 0.55, 'walk': (1.6, 4.1), 'through': (3.5, 4.1)},
               'door_back': {'appear': (0, 0.4), 'snap': 0.95, 'walk': (0, 2.7)},
               'mine': {'hit1': 1.1, 'hit2': 1.7, 'hit3': 2.3, 'eyes': 3.0},
               'handheld': {'play': (1.0, 3.0), 'delete': 3.1, 'shake': (3.3, 4.0)},
               'ears': {'tune': (0.4, 4.2)}, 'push': {'push': (0.8, 3.1)}, 'binoculars': {'look': (0.8, 3.9), 'spot': 2.6}})


# ---- THE TRINKET TRIPS: she snaps a portal open into an old video game, it swallows the room, she grabs something
# out of the air there, admires it and snaps herself home (the game draws the worlds: recordsTrips.js)
SNAP_L = lambda shape: {'w': V(16, -8, 38), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.3, -0.2, 1), 'nrm': V(-1, 0, 0), 'shape': shape}
WHOA = {'body': {'rx': -5, 'z': 0.8}, 'head': {'pitch': -8, 'roll': 4},
        'r': {'w': V(-24, -5, 30), 'pole': V(-1, 0.3, -0.6), 'dir': V(-0.4, -0.3, 1), 'nrm': V(0, -1, 0), 'shape': 'open'},
        'l': {'w': V(24, -5, 30), 'pole': V(1, 0.3, -0.6), 'dir': V(0.4, -0.3, 1), 'nrm': V(0, -1, 0), 'shape': 'open'}}
CLASP = lambda yaw, pitch=0, roll=0: {'head': {'yaw': yaw, 'pitch': pitch, 'roll': roll}, 'body': {'rz': yaw * 0.25},
                                      'r': {'w': V(-2.5, -10, 31), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(1, 0, 0), 'shape': 'cup'},
                                      'l': {'w': V(2.5, -10, 31), 'pole': V(1, 0.3, -0.6), 'dir': V(-0.4, -0.2, 1), 'nrm': V(-1, 0, 0), 'shape': 'cup'}}
def _warp():
    """THE SNAP OUT (~4.8 s): she snaps, a portal opens beside her, she leans back as it swallows the room - then,
    hands clasped under her chin, looks all round the game world she's standing in."""
    return [(0, {}), (0.35, {'r': SNAP_R('fist'), 'head': {'roll': -6}}), (0.55, {'r': SNAP_R('point'), 'head': {'roll': -8}}),
            (0.8, {'r': SNAP_R('open'), 'head': {'roll': -4, 'yaw': -14}}),
            (1.3, WHOA), (1.8, KP(WHOA, body={'rx': -8, 'z': 1.4}, head={'pitch': -12, 'roll': 2})),
            (2.3, CLASP(0, -4, 6)), (2.9, CLASP(-34, -6, -4)), (3.5, CLASP(-34, -8, -6)), (4.0, CLASP(30, -6, 6)),
            (4.4, CLASP(30, -10, 8)), (4.8, CLASP(0, -12, 4))]


def _grab():
    """She reaches out into the air beside her and closes her hand on the trinket hanging there."""
    reach = lambda x, shape: {'body': {'rz': -18, 'ry': -4, 'x': -2}, 'head': {'yaw': -30, 'roll': -4},
                              'r': {'w': V(x, -8, 33), 'pole': V(-0.2, 0.6, -1), 'dir': V(-1, -0.2, 0.2), 'nrm': V(0, 0, -1), 'shape': shape}}
    return [(0, CLASP(0, -12, 4)), (0.45, reach(-40, 'open')), (0.8, reach(-44, 'open')), (1.0, reach(-44, 'fist')),
            (1.5, {'body': {'rz': -8, 'ry': 2}, 'head': {'yaw': -8, 'roll': 6}, 'r': {'w': V(-18, 2, 30), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}}),
            (2.0, {'r': {'w': V(-14, 6, 26), 'pole': V(-1, 0.3, -0.6), 'dir': V(0.4, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}, 'head': {'roll': 6}})]


def _snapback():
    """THE SNAP HOME (~3 s): she holds the trinket up to admire it, snaps with her free hand - the game's gone."""
    held = lambda w: {'w': w, 'pole': V(-1, 0.3, -0.6), 'dir': V(0.3, -0.2, 1), 'nrm': V(0, -1, 0), 'shape': 'hold'}
    up = held(V(-11, -7, 40))
    return [(0, {'r': held(V(-14, 6, 26)), 'head': {'roll': 6}}),
            (0.5, {'r': up, 'head': {'roll': 10, 'pitch': -6, 'yaw': -10}}),
            (1.1, {'r': up, 'head': {'roll': -6, 'pitch': -4, 'yaw': -12}}),
            (1.5, {'r': up, 'l': SNAP_L('fist'), 'head': {'roll': 4, 'yaw': 6}}),
            (1.7, {'r': up, 'l': SNAP_L('point'), 'head': {'roll': 8, 'yaw': 8}}),
            (1.95, {'r': {**up, 'shape': 'open'}, 'l': SNAP_L('open'), 'head': {'roll': 6}}),
            (2.5, {'head': {'roll': 4}}), (3.0, {})]


ANIMS.update({'warp': _warp(), 'grab': _grab(), 'snapback': _snapback()})
EVENTS.update({'warp': {'snap': 0.55, 'swallow': 1.8, 'look': (2.3, 4.8)}, 'grab': {'reach': (0.45, 0.95), 'grab': 1.0},
               'snapback': {'admire': (0.5, 1.4), 'snap': 1.7}})


def pose_at(name, t):
    """The pose of animation `name` at t seconds (eased between keys)."""
    keys = ANIMS[name]
    full = [(kt, merge(BASE, kp)) for kt, kp in keys]
    if t <= full[0][0]: return full[0][1]
    for (t0, p0), (t1, p1) in zip(full, full[1:]):
        if t <= t1: return lerp(p0, p1, ease((t - t0) / max(1e-6, t1 - t0)))
    return full[-1][1]


def figure(p):
    """Builds her in pose p. Returns ({name: (Mesh, matrix or None)}, head matrix, {r, l: hand centre (world)})."""
    b = p['body']
    hx, hy, hz = HOME
    body_M = H.T(hx + b['x'], hy + b['y'], hz + b['z'], rx=b['rx'], ry=b['ry'], rz=b['rz'])
    parts = {k: (m, None) for k, m in torso(body_M).items()}
    parts['legs'] = (legs(body_M, p.get('step', 0)), None)
    hd = p['head']
    neck = body_M @ Vector(NECK)
    rot = body_M.to_3x3().to_4x4()
    head_M = H.T(*neck) @ rot @ H.T(rz=hd['yaw'], rx=-hd['pitch'], ry=hd['roll']) @ H.T(0, -0.6, 10.0)
    for k, m in head(p['hat']).items(): parts[k] = (m, head_M)
    hands = {}
    for side, s in (('r', -1), ('l', 1)):
        a = p[side]
        S = body_M @ Vector((s * SHOULDER[0], SHOULDER[1], SHOULDER[2]))
        pole = Vector(a['pole'])
        if b['rz']: pole = Matrix.Rotation(math.radians(b['rz']), 3, 'Z') @ pole if abs(b['rz']) > 90 else pole
        w_, d_, n_ = Vector(a['w']), a['dir'], a['nrm']
        lk = a.get('local', 0)
        if lk > 0:                                                        # (arms given on her body: they walk with her)
            R3 = body_M.to_3x3()
            w_ = w_.lerp(body_M @ Vector(a['w']), lk)
            pole = pole.lerp(R3 @ Vector(a['pole']), lk)
            d_ = tuple(Vector(d_).lerp(R3 @ Vector(d_), lk)); n_ = tuple(Vector(n_).lerp(R3 @ Vector(n_), lk))
        ms, E, W, (hc, frame) = arm(s, S, w_, pole, d_, n_, a['shape'])
        for k, m in ms.items(): parts[k] = (m, None)
        hands[side] = (hc, W, a)
        pr = p.get('prop_' + side)
        if pr:
            pm = prop(pr, hc, frame, p, s)
            if pm: parts['prop_' + side] = (pm, None)
    if p.get('stamp', 0) >= 0.5:
        hc, W, a = hands['r']; parts['stamp'] = (stamp_prop(W, a['dir'], a['nrm']), None)
    if p.get('phones', 0) >= 0.5: parts['phones'] = (phones(head_M), None)
    return parts, head_M, {k: v[0] for k, v in hands.items()}


# ------------------------------------------------------------------ the room, the counter, the bins
def counter():
    """The records counter and what's on it. Returns {name: Mesh}."""
    out = {}
    m = H.Mesh()
    m.box((0, -2, -1.6), (196, 26, 3.2), WALNUT2)                         # the top
    m.box((0, -15.2, -2.0), (198, 1.4, 4.0), WALNUT3)                     # its rounded front edge
    m.box((0, -1, -36), (190, 22, 64), WALNUT)                            # the body
    for x in range(-80, 81, 32):                                          # raised panels on the front
        m.box((x, -12.6, -32), (26, 1.6, 40), WALNUT4)
        m.box((x, -13.2, -32), (22, 1.2, 36), WALNUT2)
    m.box((0, -12.4, -8), (190, 1.6, 4), WALNUT3)
    m.box((0, -13.6, -64), (194, 3, 6), WALNUT3)                          # the kick
    out['counter'] = m
    r = H.Mesh()                                                          # a brass foot rail and the nameplate
    r.limb((-92, -19, -56), (92, -19, -56), 1.2, 1.2, GOLD, sides=6)
    for x in (-70, 0, 70): r.limb((x, -12.5, -56), (x, -19, -56), 0.8, 0.8, GOLD2, sides=5)
    r.box((0, -14.0, -18.5), (44, 0.8, 9), GOLD); r.box((0, -14.5, -18.5), (41, 0.6, 7), GOLD2)
    out['rail'] = r
    bl = H.Mesh()                                                         # the bell
    bx, by = -44, -4
    bl.hull(ring((bx, by, 0), 5.2, 5.2, 0.1, 12, 0, 2 * math.pi)[:12] + ring((bx, by, 0), 5.2, 5.2, 1.0, 12, 0, 2 * math.pi)[:12], IRON)
    bl.hull(ell((bx, by, 1.2), (4.4, 4.4, 4.0), nu=12, nv=6, cut=lambda x, y, z: z >= 1.2), GOLD)
    bl.limb((bx, by, 5.0), (bx, by, 6.4), 0.6, 0.6, GOLD2); bl.hull(ell((bx, by, 6.8), (0.9, 0.9, 0.7), nu=6, nv=3), GOLD)
    out['bell'] = bl
    lp = H.Mesh()                                                         # the banker's lamp
    lx, ly = 66, 2
    lp.hull(ring((lx, ly, 0), 7, 5, 0.1, 12, 0, 2 * math.pi)[:12] + ring((lx, ly, 0), 6, 4.2, 2.0, 12, 0, 2 * math.pi)[:12], GOLD)
    lp.limb((lx, ly, 2), (lx, ly + 1, 16), 0.8, 0.8, GOLD2)
    lp.limb((lx - 3, ly + 1.2, 16.5), (lx + 3, ly + 1.2, 16.5), 0.6, 0.6, GOLD2)
    out['lamp'] = lp
    sh = H.Mesh()
    sh.hull([(lx + x, ly + y, 16 + z) for x in (-11, 11) for y, z in ((-5.2, 0), (5.2, 0), (-3.2, 5.0), (3.2, 5.0))] +
            [(lx + x, ly + y, 21.6) for x in (-8, 8) for y in (-1.2, 1.2)], GREEN)
    sh.box((lx, ly, 16.0), (21.6, 9.6, 0.5), LAMPGLOW)
    out['shade'] = sh
    pad = H.Mesh(); pad.box((-22, -3, 0.5), (11, 7, 1.0), IRON); pad.box((-22, -3, 1.05), (9.6, 5.8, 0.3), INKPAD); out['pad'] = pad
    tr = H.Mesh()                                                         # a tray of folders
    tx, ty = 40, -1
    tr.box((tx, ty, 0.6), (20, 15, 1.2), WALNUT3)
    for k, c in enumerate((MANILA, PAPER, MANILA2, PAPER2, MANILA)):
        tr.box((tx + (k % 2) * 0.6 - 0.3, ty + (k % 3) * 0.4, 1.5 + k * 0.7), (17.4, 12.4, 0.6), c)
    tr.box((tx - 3, ty - 6.4, 4.8), (5, 0.6, 1.6), MANILA2)
    out['tray'] = tr
    bc = H.Mesh()                                                         # her briefcase, standing at the end of the counter
    cx, cy = -78, 1
    bc.box((cx, cy, 8.6), (24, 8, 16.8), LEATHER)
    bc.box((cx, cy, 15.9), (24.6, 8.6, 1.4), LEATHER2)
    bc.box((cx, cy, 0.9), (24.6, 8.6, 1.4), LEATHER2)
    for x in (-7, 7): bc.box((cx + x, cy - 4.3, 14.2), (2.6, 0.8, 2.4), GOLD)
    bc.limb((cx - 5, cy, 17.4), (cx - 3.5, cy, 20.5), 0.8, 0.8, LEATHER2); bc.limb((cx - 3.5, cy, 20.5), (cx + 3.5, cy, 20.5), 0.8, 0.8, LEATHER2)
    bc.limb((cx + 3.5, cy, 20.5), (cx + 5, cy, 17.4), 0.8, 0.8, LEATHER2)
    out['briefcase'] = bc
    rd = H.Mesh()                                                         # a rolodex
    rx_, ry_ = -60, -3
    rd.box((rx_, ry_, 0.8), (11, 7, 1.6), IRON)
    for k in range(-4, 5):
        a = k * 0.2
        rd.hull([(rx_ + 4.2 * math.sin(a) + dx, ry_ + dy, 3.2 + 4.2 * math.cos(a) + dz) for dx in (-0.3, 0.3) for dy in (-2.6, 2.6) for dz in (-2.4, 0)], PAPER if k % 2 else PAPER2)
    rd.limb((rx_ - 5.4, ry_, 1.6), (rx_ - 5.4, ry_, 5.0), 0.5, 0.5, IRON, sides=4); rd.limb((rx_ + 5.4, ry_, 1.6), (rx_ + 5.4, ry_, 5.0), 0.5, 0.5, IRON, sides=4)
    rd.limb((rx_ - 5.4, ry_, 5.0), (rx_ + 5.4, ry_, 5.0), 0.45, 0.45, IRON, sides=4)
    rd.hull(ell((rx_ + 6.4, ry_, 5.0), (0.9, 0.9, 0.9), nu=6, nv=3), RED)
    out['rolodex'] = rd
    pc = H.Mesh()                                                         # a pencil cup
    px_, py_ = 18, -6
    cyl(pc, (px_, py_), 2.4, 0.0, 6.2, MAROON, 10)
    for k, (dx, dy, col) in enumerate(((-0.8, 0.4, SUNNY), (0.9, -0.3, SUNNY), (0.1, 1.0, RED), (0.6, 0.9, SKY))):
        top = (px_ + dx * 2.2, py_ + dy * 1.6, 11.0 + (k % 2) * 1.4)
        pc.limb((px_ + dx, py_ + dy, 1.0), top, 0.45, 0.45, col, sides=6)
        pc.hull(ell(top, (0.5, 0.5, 0.6), nu=6, nv=3), PINK if col == SUNNY else col)
    out['pencils'] = pc
    pl = H.Mesh()                                                         # a little potted plant
    gx, gy = 84, -2
    pl.hull(ring((gx, gy), 4.0, 4.0, 0.0, 10) + ring((gx, gy), 5.0, 5.0, 7.0, 10), TERRA)
    pl.hull(ring((gx, gy), 5.4, 5.4, 6.6, 10) + ring((gx, gy), 5.4, 5.4, 8.0, 10), TERRA)
    for k in range(7):
        a = 2 * math.pi * k / 7
        tip = (gx + 7.5 * math.cos(a), gy + 5 * math.sin(a), 15 + 3 * (k % 2))
        pl.hull([(gx, gy, 7.6), (gx + 1.2 * math.cos(a + 1.5), gy + 1.2 * math.sin(a + 1.5), 8), tip, (tip[0] * 0.6 + gx * 0.4, tip[1] * 0.6 + gy * 0.4, tip[2] + 2)], LEAF if k % 2 else LEAF2)
    out['plant'] = pl
    return out


def bins():
    """Her paperwork bins: an open-topped walnut cabinet behind her to the left of the picture, stuffed with folders -
    she turns and digs in it. Returns {name: Mesh}."""
    m = H.Mesh()
    cx, x0, x1, y0, y1 = -52, -76, -28, 38, 62
    m.box((cx, (y0 + y1) / 2, -18), (x1 - x0, y1 - y0, 46), WALNUT)        # the drawers below
    for z in (-8, -28):
        m.box((cx, y0 - 0.8, z), (x1 - x0 - 6, 1.4, 14), WALNUT4); m.box((cx, y0 - 1.6, z + 3), (6, 1, 1.4), GOLD)
    m.box((cx, y1 - 1, 12), (x1 - x0, 2, 16), WALNUT3)                    # the back of the bins
    for x in (x0, cx, x1): m.box((x, (y0 + y1) / 2, 12), (2.4, y1 - y0, 16), WALNUT2)   # sides + a divider
    m.box((cx, y0 + 0.8, 6.8), (x1 - x0, 1.6, 6.6), WALNUT2)             # the low front of the bins
    m.box((cx, y0 + 0.2, 7.0), (10, 0.6, 3), PAPER)                       # its label
    p = H.Mesh()
    rng = np.random.default_rng(11)
    for xa in (x0 + 3, cx + 3):
        for k in range(6):
            x = xa + k * 3.4 + rng.uniform(-0.5, 0.5); h = rng.uniform(10, 15.5); y = rng.uniform(y0 + 5, y1 - 5)
            c = (MANILA, PAPER, MANILA2, PAPER2)[int(rng.integers(0, 4))]
            p.hull([(x + dx, y + dy, 4 + dz) for dx in (-0.4, 0.4) for dy in (-6, 6) for dz in (0, h)] +
                   [(x + rng.uniform(-1, 1) + dx, y + dy, 4 + h + 0.5) for dx in (-0.4, 0.4) for dy in (-5, 5)], c)
    return {'bins': m, 'binpapers': p}


def room():
    """The records office behind her: wainscot and wallpaper, card catalogues, a clock, two hanging lamps. {name: Mesh}"""
    out = {}
    w = H.Mesh()
    w.box((0, 132, 90), (520, 4, 160), WALL)                               # the papered wall
    for x in range(-240, 241, 20): w.box((x, 129.7, 90), (1.0, 0.4, 160), WALL2)   # its stripes
    w.box((0, 129, -20), (520, 4, 80), WALNUT)                             # the wainscot
    w.box((0, 127, 20), (520, 4, 3), WALNUT3)
    for x in range(-240, 241, 40): w.box((x, 126.6, -20), (32, 1.4, 60), WALNUT4)
    w.box((0, 40, -64), (560, 260, 2), FLOOR)
    w.box((0, 129, 168), (520, 6, 8), WALNUT3)                             # the cornice
    out['wall'] = w
    cab = H.Mesh()                                                        # card catalogues, both sides
    for s in (-1, 1):
        cx = s * 128
        cab.box((cx, 112, 30), (86, 30, 190), WALNUT)
        cab.box((cx, 96.6, 126), (90, 2, 5), WALNUT3)
        for i in range(5):
            for j in range(9):
                x = cx - 34 + i * 17; z = -46 + j * 17
                cab.box((x, 96.8, z), (15, 1.2, 15), WALNUT2)
                cab.box((x, 95.9, z + 3), (5.4, 0.8, 3.4), PAPER)          # label slot
                cab.box((x, 95.8, z - 2.6), (4, 1.0, 1.4), GOLD)           # pull
    out['cabinets'] = cab
    lad = H.Mesh()
    for x in (-168, -150): lad.limb((x, 93, -60), (x + 4, 92, 118), 1.1, 1.1, WALNUT3, sides=5)
    for z in range(-50, 115, 14): lad.limb((-168 + (z + 60) / 178 * 4, 92.6, z), (-150 + (z + 60) / 178 * 4, 92.6, z), 0.7, 0.7, WALNUT3, sides=5)
    lad.limb((-190, 94, 120), (-110, 94, 120), 0.8, 0.8, GOLD)
    out['ladder'] = lad
    ck = H.Mesh()                                                         # the clock
    ck.hull([(x, 126, z + 120) for x, z, _ in ring((0, 0, 0), 15, 15, 0, 16, 0, 2 * math.pi)[:16]] +
            [(x, 129.5, z + 120) for x, z, _ in ring((0, 0, 0), 16.5, 16.5, 0, 16, 0, 2 * math.pi)[:16]], GOLD)
    ck.hull([(x, 125.4, z + 120) for x, z, _ in ring((0, 0, 0), 13.2, 13.2, 0, 16, 0, 2 * math.pi)[:16]] +
            [(x, 125.8, z + 120) for x, z, _ in ring((0, 0, 0), 13.2, 13.2, 0, 16, 0, 2 * math.pi)[:16]], CLOCKF)
    for k in range(12):
        a = 2 * math.pi * k / 12
        ck.box((11 * math.sin(a), 125.2, 120 + 11 * math.cos(a)), (1.2, 0.3, 1.2), INKC)
    ck.limb((0, 125.0, 120), (5.8, 125.0, 123.4), 0.5, 0.4, INKC, sides=4)
    ck.limb((0, 124.9, 120), (-2.2, 124.9, 128.6), 0.5, 0.4, INKC, sides=4)
    out['clock'] = ck
    for s in (-1, 1):                                                     # two hanging lamps
        lm = H.Mesh(); x = s * 62
        lm.limb((x, 70, 175), (x, 70, 140), 0.4, 0.4, IRON, sides=4)
        lm.hull(ring((x, 70, 0), 3, 3, 140, 8, 0, 2 * math.pi)[:8] + ring((x, 70, 0), 11, 11, 132, 12, 0, 2 * math.pi)[:12], GREEN2)
        lm.hull(ring((x, 70, 0), 10.4, 10.4, 131.8, 12, 0, 2 * math.pi)[:12] + [(x, 70, 129.5)], LAMPGLOW)
        out['hang%d' % (s + 1)] = lm
    fr = H.Mesh()                                                         # a framed notice: OPERATION REBIRTH's star
    for s in (-1,):
        pass
    fr.box((0, 128.4, 72), (40, 1.4, 28), GOLD2)
    fr.box((0, 127.6, 72), (36, 0.6, 24), PAPER)
    st = [(0, 127.2, 72 + 9)]
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5; r = 8.5 if k % 2 == 0 else 3.6
        pts.append((r * math.cos(a), 127.1, 72 + r * math.sin(a)))
    for k in range(10):
        a, b = pts[k], pts[(k + 1) % 10]
        fr.hull([a, b, (0, 127.1, 72), (a[0], 127.4, a[2]), (b[0], 127.4, b[2]), (0, 127.4, 72)], MAROON)
    out['notice'] = fr
    out.update(bins())
    out.update(cocoa_corner())
    out.update(tape_shelf())
    return out


def cocoa_corner():
    """Her hot cocoa machine on a little cabinet behind her to the right: cream enamel with chrome, a nozzle, a drip
    grate, a red button and a light; a mug tree, a jar of marshmallows. Returns {name: Mesh}."""
    m = H.Mesh()
    cx, x0, x1, y0, y1 = 36, 20, 54, 40, 60
    m.box((cx, (y0 + y1) / 2, -18), (x1 - x0, y1 - y0, 46), WALNUT)        # the cabinet
    m.box((cx, (y0 + y1) / 2, 5.6), (x1 - x0 + 2, y1 - y0 + 2, 1.6), WALNUT2)
    m.box((cx, y0 - 0.8, -10), (x1 - x0 - 6, 1.4, 16), WALNUT4); m.box((cx, y0 - 1.6, -7), (6, 1, 1.4), GOLD)
    k = H.Mesh()
    mx, my = 34, 48
    k.box((mx, my, 19), (15, 11, 26), CREAM)                              # the machine's body
    k.hull(ell((mx, my, 32), (7.6, 5.6, 3.4), nu=10, nv=5, cut=lambda x, y, z: z >= 32), CREAM)
    k.box((mx, my - 5.6, 22), (12, 0.6, 9), CHROME)                       # the front plate
    k.box((mx, my - 6.0, 27.6), (8, 0.6, 2.2), COCOA2)                    # its label
    k.box((mx, my - 4.6, 15.6), (5, 3, 2.2), CHROME2)                     # the spout block
    k.limb((mx, my - 5.2, 14.6), (mx, my - 5.2, 13.2), 0.7, 0.5, CHROME, sides=6)   # the nozzle
    k.box((mx, my - 4.0, 7.0), (12, 7, 1.4), CHROME2)                     # the drip grate
    for gx in range(-4, 5, 2): k.box((mx + gx, my - 4.0, 7.75), (0.5, 6.4, 0.2), CHROME)
    k.hull(ell((mx + 5.0, my - 6.0, 21.6), (1.2, 0.8, 1.2), nu=6, nv=3), RED)       # the button
    k.box((mx - 5.0, my - 5.9, 21.6), (1.4, 0.6, 1.4), LAMPGLOW)                       # the light
    k.limb((mx, my, 35), (mx, my, 37), 1.2, 0.9, CHROME2, sides=6)
    out = {'cabinet2': m, 'machine': k}
    t = H.Mesh()                                                          # the mug tree
    tx, ty = 47, 47
    t.box((tx, ty, 7), (7, 7, 1.4), WALNUT3); t.limb((tx, ty, 7), (tx, ty, 23), 0.7, 0.7, WALNUT3, sides=6)
    for a, h in ((0.3, 20), (2.4, 16), (4.3, 18)):
        t.limb((tx, ty, h), (tx + 3 * math.cos(a), ty + 3 * math.sin(a), h + 1.4), 0.4, 0.4, WALNUT3, sides=4)
    for (a, h, col) in ((2.4, 16, CREAM), (4.3, 18, SKY)):
        mm = mug((tx + 5.2 * math.cos(a), ty + 5.2 * math.sin(a), h - 2.6), False, 0)
        mm.c = [col if c_ == CREAM else c_ for c_ in mm.c]
        out['mug_%d' % h] = mm
    out['mugtree'] = t
    j = H.Mesh()                                                          # the marshmallow jar
    jx, jy = 22, 46
    cyl(j, (jx, jy), 3.4, 6.4, 15.0, LENS, 10)
    cyl(j, (jx, jy), 3.0, 15.0, 15.6, MALLOW, 10)
    for k2, (dx, dy) in enumerate(((-1.2, -0.8), (1.0, -1.2), (0.2, 1.0), (-1.4, 1.1), (1.5, 0.6))):
        j.box((jx + dx, jy + dy, 16.2 + 0.4 * (k2 % 2)), (1.4, 1.4, 1.3), MALLOW2 if k2 % 2 else MALLOW)
    j.box((jx, jy - 3.5, 10.4), (3.6, 0.2, 2.6), PAPER)
    out['jar'] = j
    return out


def tape_shelf():
    """A wall shelf over her bins: her boombox (two speakers, a cassette door, buttons on top, a handle, stickers all
    over) and a row of cassettes. Returns {name: Mesh}."""
    s_ = H.Mesh()
    y0, y1, z = 44, 60, 40
    s_.box((-46, (y0 + y1) / 2, z - 0.8), (46, y1 - y0, 1.6), WALNUT2)
    for x in (-64, -28): s_.hull([(x - 1, y1, z - 1.6), (x + 1, y1, z - 1.6), (x - 1, y1, z - 9), (x + 1, y1, z - 9), (x - 1, y0 + 6, z - 1.6), (x + 1, y0 + 6, z - 1.6)], WALNUT3)
    b = H.Mesh()
    bx, by, bz = -46, 52, z                                               # (its bottom middle)
    b.box((bx, by, bz + 7.5), (28, 8, 15), PLASTIC2)                      # the body
    b.box((bx, by - 4.1, bz + 7.5), (27, 0.4, 14), PLASTIC)
    for sx in (-1, 1):                                                    # the speakers
        sc = (bx + sx * 8.6, by - 4.4, bz + 7.0)
        b.hull([(sc[0] + 5.0 * math.cos(t_), sc[1] + d, sc[2] + 5.0 * math.sin(t_)) for t_ in [k * math.pi / 6 for k in range(12)] for d in (0, 0.3)], CHROME2)
        b.hull([(sc[0] + 4.2 * math.cos(t_), sc[1] - 0.2 + d, sc[2] + 4.2 * math.sin(t_)) for t_ in [k * math.pi / 6 for k in range(12)] for d in (0, 0.3)], GRILL)
        b.hull(ell((sc[0], sc[1] - 0.6, sc[2]), (1.3, 0.6, 1.3), nu=6, nv=3), CHROME)
    b.box((bx, by - 4.5, bz + 7.4), (8.4, 0.4, 6.4), CHROME2)            # the cassette door
    b.box((bx, by - 4.8, bz + 7.4), (7.0, 0.3, 4.0), GRILL)               # its window
    for k, col in enumerate((CHROME, CHROME, RED, CHROME)):               # the buttons on top
        b.box((bx - 3.6 + k * 2.4, by - 1.6, bz + 15.4), (1.8, 2.4, 1.0), col)
    b.limb((bx - 10, by, bz + 15), (bx - 8, by, bz + 19), 0.8, 0.8, CHROME2, sides=5)   # the handle
    b.limb((bx - 8, by, bz + 19), (bx + 8, by, bz + 19), 0.8, 0.8, CHROME2, sides=5)
    b.limb((bx + 8, by, bz + 19), (bx + 10, by, bz + 15), 0.8, 0.8, CHROME2, sides=5)
    b.limb((bx + 10, by - 3.0, bz + 14.2), (bx + 13.5, by - 3.0, bz + 24), 0.3, 0.2, CHROME, sides=4)   # an aerial
    st = H.Mesh()                                                         # stickers: a star, a heart, a bolt, a smile, a stripe
    def sticker(cx_, cz_, pts2, col):
        st.hull([(cx_ + px_, by - 4.75 - d, cz_ + pz_) for px_, pz_ in pts2 for d in (0, 0.15)], col)
    star = [(math.cos(math.pi / 2 + k * math.pi / 5) * (1.8 if k % 2 == 0 else 0.8), math.sin(math.pi / 2 + k * math.pi / 5) * (1.8 if k % 2 == 0 else 0.8)) for k in range(10)]
    for k in range(10): sticker(bx - 9.2, bz + 13.2, [(0, 0), star[k], star[(k + 1) % 10]], SUNNY)
    sticker(bx + 3.8, bz + 2.0, [(-1.2, 0.4), (1.2, 0.4), (0, -1.2), (-0.7, 1.1), (0.7, 1.1)], PINK)
    sticker(bx - 3.6, bz + 1.8, [(-0.4, 1.4), (0.6, 1.4), (0.0, 0.1), (0.8, 0.1), (-0.6, -1.6), (-0.1, -0.2), (-0.8, -0.2)], SKY)
    sticker(bx + 9.4, bz + 13.4, [(1.4 * math.cos(k * math.pi / 5), 1.4 * math.sin(k * math.pi / 5)) for k in range(10)], MINT)
    sticker(bx + 13.4, bz + 6.0, [(-0.4, -5), (0.4, -5), (-0.4, 5), (0.4, 5)], RED)
    c = H.Mesh()                                                          # the cassettes, standing in a row
    for k, col in enumerate((SUNNY, PINK, MINT, SKY, RED, CREAM, SUNNY)):
        x = -29.5 + k * 1.6 if k < 4 else -66 + (k - 4) * 1.6
        c.box((x, by, bz + 3.6), (1.2, 8, 7.2), PLASTIC)
        c.box((x, by - 3.9, bz + 4.0), (1.0, 0.3, 4.4), col)
    return {'shelf': s_, 'boombox': b, 'stickers': st, 'cassettes': c}


# ------------------------------------------------------------------ rendering
SCALE = VW // H.RES[0]


def to_screen(cam, p):
    """A world point -> pixel on the game's 640x360 view."""
    v = world_to_camera_view(bpy.context.scene, cam, Vector(p))
    return v.x * VW, (1 - v.y) * VH


# the room's things she reaches into or past: they cut her out where they're in front of her
BACK_CUT = {'bins', 'binpapers', 'cabinet2', 'machine', 'mugtree', 'jar', 'shelf', 'boombox', 'stickers', 'cassettes'}


def setup():
    """The scene: materials, the room / bins / counter (lit, snapped), the camera. Returns (cam, mats)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    H.render_settings(); H.lights()
    mats = H.materials(None)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    loc, tgt, lens = CAM
    cam.location = loc; cam.data.lens = lens; cam.data.clip_end = 5000
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    for nm, m in room().items():
        ob = H.to_object(nm, m, mats); ob['room'] = 1
        if nm in BACK_CUT or nm.startswith('mug_'): ob['bins'] = 1
    for nm, m in counter().items():
        ob = H.to_object(nm, m, mats); ob['desk'] = 1
    for ob in list(bpy.data.objects):
        if ob.type == 'MESH': H.light_up(ob, cam, snap=True)
    return cam, mats


def mode(room_m, desk_m, bins_m=None):
    """How the room and the counter take part: 'show', 'cut' (holdout) or 'hide'. bins_m for the bins (else room_m)."""
    for ob in bpy.data.objects:
        if ob.type != 'MESH' or ob.get('her'): continue
        md = desk_m if ob.get('desk') else (bins_m or room_m) if ob.get('bins') else room_m
        ob.hide_render = md == 'hide'; ob.is_holdout = md == 'cut'


def place(parts, mats, cam):
    """Puts her parts in the scene (replacing the last frame's), lit and snapped."""
    for ob in list(bpy.data.objects):
        if ob.get('her'):
            me = ob.data; bpy.data.objects.remove(ob)
            if me is not None and me.users == 0: bpy.data.meshes.remove(me)
    obs = []
    for nm, (m, M) in parts.items():
        ob = H.to_object(nm, m, mats); ob['her'] = 1
        if M is not None: ob.matrix_world = M
        obs.append(ob)
    bpy.context.view_layer.update()
    for ob in obs: H.light_up(ob, cam, snap=True)
    return obs


def shoot(path):
    """Renders the whole 320x180 view to path; returns it through the PS1 colour (RGBA array)."""
    sc = bpy.context.scene; sc.render.filepath = path; sc.render.use_border = False
    bpy.ops.render.render(write_still=True)
    return H.ps1_post(np.array(Image.open(path).convert('RGBA')))


def clean(img):
    """Drops stray specks (a holdout's odd lone pixel)."""
    from scipy.ndimage import label
    lab, n = label(img[..., 3] > 0)
    if n > 1:
        sizes = np.bincount(lab.ravel()); sizes[0] = 0
        img = img.copy(); img[(lab > 0) & (sizes[lab] < 10)] = 0
    return img


def trim(img):
    """Crops to what's drawn; returns (crop, x, y) in the render's pixels."""
    ys, xs = np.nonzero(img[..., 3])
    if not len(xs): return img[:1, :1], 0, 0
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(), int(xs.min()), int(ys.min())


def quantize(arr, colours=256):
    """RGBA -> a palette image (no extra dither: the PS1 dither is in it)."""
    import imagequant
    return imagequant.quantize_pil_image(Image.fromarray(arr), dithering_level=0.0, max_colors=colours, min_quality=0, max_quality=100)


def face_info(cam, head_M):
    """Where her face goes on the 640x360 view: [x, y, px per unit, roll (deg), facing (1 = straight at you)]."""
    c = head_M @ Vector((0, -HEAD_R[1], -1.0))
    r = head_M @ Vector((1, -HEAD_R[1], -1.0)); u = head_M @ Vector((0, -HEAD_R[1], 0.0))
    sx, sy = to_screen(cam, c); ux, uy = to_screen(cam, u); rx, ry = to_screen(cam, r)
    n = (head_M.to_3x3() @ Vector((0, -1, 0))).normalized()
    facing = n.dot((cam.location - c).normalized())
    s = math.hypot(ux - sx, uy - sy)
    roll = math.degrees(math.atan2(ux - sx, -(uy - sy)))
    side = (rx - sx) / max(1e-6, s)                                       # (how wide one unit across the face is, vs tall)
    return [round(sx, 1), round(sy, 1), round(s, 3), round(roll, 1), round(facing, 2), round(side, 2)]


def pack(crops, name):
    """One sheet per animation (rows wrapping at 2048 px). Returns (file, [(sx, sy, w, h)])."""
    hmax = max(c.shape[0] for c in crops); rows, row, rw = [], [], 0
    for c in crops:
        if rw + c.shape[1] > 2048 and row: rows.append(row); row, rw = [], 0
        row.append(c); rw += c.shape[1] + 1
    rows.append(row)
    W = max(sum(c.shape[1] + 1 for c in r) for r in rows); Hh = (hmax + 1) * len(rows)
    sheet = np.zeros((Hh, W, 4), np.uint8); places = []
    for ri, r in enumerate(rows):
        xx = 0
        for c in r:
            sheet[ri * (hmax + 1):ri * (hmax + 1) + c.shape[0], xx:xx + c.shape[1]] = c
            places.append((xx, ri * (hmax + 1), c.shape[1], c.shape[0])); xx += c.shape[1] + 1
    fn = 'arch_%s.png' % name
    quantize(sheet).save(os.path.join(OUT, fn), optimize=True)
    return fn, places


def box_of(cam, obs, pad=3):
    """The 640x360 screen box round some objects: [x, y, w, h]."""
    xs, ys = [], []
    for ob in obs:
        for v in ob.data.vertices:
            x, y = to_screen(cam, ob.matrix_world @ v.co); xs.append(x); ys.append(y)
    return [round(min(xs)) - pad, round(min(ys)) - pad, round(max(xs) - min(xs)) + 2 * pad, round(max(ys) - min(ys)) + 2 * pad]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only'); ap.add_argument('--preview'); ap.add_argument('--still')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'arch_tmp.png')
    cam, mats = setup()
    table = {'scale': SCALE, 'fps': FPS, 'anims': {}}
    if os.path.exists(TABLE) and a.only:
        src = open(TABLE).read(); table = json.loads(src[src.index('{'):src.rindex('}') + 1])
    if a.still:                                                           # one test picture of a pose: --still anim:seconds
        nm, t = a.still.split(':'); place(figure(pose_at(nm, float(t)))[0], mats, cam)
        mode('show', 'show'); img = shoot(tmp)
        Image.fromarray(img).resize((VW * 2, VH * 2), Image.NEAREST).save(os.path.join(a.preview or '.', 'still.png'))
        Image.fromarray(img[30:110, 110:210]).resize((600, 480), Image.NEAREST).save(os.path.join(a.preview or '.', 'still_head.png')); return
    if not a.only or 'room' in a.only.split(','):
        for ob in list(bpy.data.objects):
            if ob.get('her'): bpy.data.objects.remove(ob)
        mode('show', 'hide'); img = shoot(tmp); img[..., 3] = 255
        quantize(img).save(os.path.join(OUT, 'room.png'), optimize=True)
        mode('hide', 'show'); img = clean(shoot(tmp)); crop, x, y = trim(img)
        quantize(crop).save(os.path.join(OUT, 'counter.png'), optimize=True)
        table['counter'] = [x * SCALE, y * SCALE]
        desk = {nm: [bpy.data.objects[nm]] for nm in ('bell', 'briefcase', 'tray', 'pad')}
        desk['lamp'] = [bpy.data.objects['lamp'], bpy.data.objects['shade']]
        for nm in ('rolodex', 'pencils', 'plant', 'machine'): desk[nm] = [bpy.data.objects[nm]]
        desk['boombox'] = [bpy.data.objects['boombox'], bpy.data.objects['stickers']]
        table['hits'] = {k: box_of(cam, v) for k, v in desk.items()}
        table['plate'] = [round(c, 1) for c in to_screen(cam, (0, -14.6, -18.5))]   # the nameplate's middle
        table['bins'] = [round(c, 1) for c in to_screen(cam, (-52, 50, 18))]          # where papers fly out of the bins
        P = lambda q: [round(c, 1) for c in to_screen(cam, q)]
        table['spots'] = {'nozzle': P((34, 42.8, 13.0)), 'light': P((29, 42.1, 21.6)), 'jar': P((22, 46, 16)),
                          'speakers': [P((-54.6, 47.4, 47)), P((-37.4, 47.4, 47))], 'window': P((-46, 47.2, 47.4)),
                          'counterTop': P((0, -15.9, 0))[1], 'corner': P((92, 110, 10)), 'door': P((70, 96, 20)),
                          'backDoor': [P((-30, 129.4, -63)), P((14, 129.4, -63)), P((14, 129.4, 66)), P((-30, 129.4, 66))]}
        table['slide'] = [[round(c, 1) for c in to_screen(cam, (-6, -3, 2))], [round(c, 1) for c in to_screen(cam, (-6, -15, 2))]]
    names = [n for n in ANIMS if not a.only or n in a.only.split(',')]
    for name in names:
        keys = ANIMS[name]; dur = keys[-1][0]
        n = max(2, int(round(dur * FPS)) + (0 if name in LOOPS else 1))
        crops, info = [], []
        for f in range(n):
            t = f / FPS
            parts, head_M, hands = figure(pose_at(name, t))
            place(parts, mats, cam)
            mode('hide', 'cut', 'cut')
            img = clean(shoot(tmp)); crop, x, y = trim(img); crops.append(crop)
            hs = {k: [round(c, 1) for c in to_screen(cam, v)] for k, v in hands.items()}
            info.append({'x': x * SCALE, 'y': y * SCALE, 'face': face_info(cam, head_M), 'hr': hs['r'], 'hl': hs['l']})
            if name == 'idle' and f == 0:
                table['her'] = box_of(cam, [ob for ob in bpy.data.objects if ob.get('her')], 0)
            if a.preview:
                os.makedirs(a.preview, exist_ok=True)
                mode('show', 'show'); full = shoot(tmp)
                Image.fromarray(full).resize((VW, VH), Image.NEAREST).save(os.path.join(a.preview, '%s_%02d.png' % (name, f)))
        fn, places = pack(crops, name)
        for fi, (sx, sy, w, h) in zip(info, places): fi.update({'sx': sx, 'sy': sy, 'w': w, 'h': h})
        ev = {k: ([int(round(v[0] * FPS)), int(round(v[1] * FPS))] if isinstance(v, tuple) else int(round(v * FPS))) for k, v in EVENTS.get(name, {}).items()}
        table['anims'][name] = {'file': fn, 'loop': name in LOOPS, 'ev': ev,
                                'frames': [[fi[k] for k in ('sx', 'sy', 'w', 'h', 'x', 'y')] + [fi['face'], fi['hr'], fi['hl']] for fi in info]}
        print(name, n, 'frames')
    with open(TABLE, 'w') as fh:
        fh.write('// THE ARCHIVIST\'s frames at the RECORDS counter - generated by tools/sprites/archivist_3d.py, do not edit by hand.\n'
                 '// anims[name].frames[i] = [sheet x, y, w, h, screen x, y (640x360), face [x, y, px per unit, roll, facing, side],\n'
                 '//   right hand [x, y], left hand [x, y]]; ev = the frames the game acts on; hits = clickable things on the counter.\n')
        fh.write('export const RECORDS_FRAMES = ' + json.dumps(table, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
