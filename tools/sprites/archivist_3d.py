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

for k, cols, look in (('a_skin', (SKIN, SKIN_D), (0.08, 0, 1)), ('a_hair', (HAIR, HAIR2), (0.22, 0, 1)),
                      ('a_felt', (NAVY, NAVY2, NAVY3), (0.06, 0, 1)), ('a_velvet', (MAROON, MAROON2), (0.3, 0, 1)),
                      ('a_gold', (GOLD, GOLD2), (0.7, 0, 1)), ('a_cotton', (WHITE, WHITE2), (0.05, 0, 1)),
                      ('a_wood', (WALNUT, WALNUT2, WALNUT3, WALNUT4, FLOOR), (0.16, 0, 1)), ('a_wall', (WALL, WALL2), (0, 0, 1)),
                      ('a_paper', (PAPER, PAPER2, MANILA, MANILA2, CLOCKF), (0, 0, 1)), ('a_leather', (LEATHER, LEATHER2), (0.35, 0, 1)),
                      ('a_glassg', (GREEN, GREEN2), (0.55, 0, 1)), ('a_glow', (LAMPGLOW,), (0, 1.1, 1)),
                      ('a_rubber', (INKPAD, RUBBER, IRON, INKC), (0.2, 0, 1))):
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
    return m, P(4.5, 0, 0)


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
    g, hc = hand(s, tuple(W), dirv, nrm, shape)
    side = 'r' if s < 0 else 'l'
    return {'sleeve_' + side: m, 'cuff_' + side: c, 'glove_' + side: g}, E, W, hc


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


# ------------------------------------------------------------------ poses
def V(*a): return tuple(a)

BASE = {
    'body': {'x': 0, 'y': 0, 'z': 0, 'rx': 3, 'ry': 0, 'rz': 0},
    'head': {'yaw': 0, 'pitch': 0, 'roll': 0},
    'hat': {'lift': 0, 'tilt': 0, 'back': 0, 'roll': 0},
    # hands folded on the counter: wrists (world), elbow pole, finger direction, palm normal
    'r': {'w': V(-6.5, 3, 2.2), 'pole': V(-1, 0.4, -0.4), 'dir': V(0.75, -0.55, 0), 'nrm': V(0, 0, -1), 'shape': 'flat'},
    'l': {'w': V(6.5, 3, 4.4), 'pole': V(1, 0.4, -0.4), 'dir': V(-0.75, -0.55, 0), 'nrm': V(0, 0, -1), 'shape': 'flat'},
    'stamp': 0,
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
        ms, E, W, hc = arm(s, S, Vector(a['w']), pole, a['dir'], a['nrm'], a['shape'])
        for k, m in ms.items(): parts[k] = (m, None)
        hands[side] = (hc, W, a)
    if p.get('stamp', 0) >= 0.5:
        hc, W, a = hands['r']; parts['stamp'] = (stamp_prop(W, a['dir'], a['nrm']), None)
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
    return out


# ------------------------------------------------------------------ rendering
SCALE = VW // H.RES[0]


def to_screen(cam, p):
    """A world point -> pixel on the game's 640x360 view."""
    v = world_to_camera_view(bpy.context.scene, cam, Vector(p))
    return v.x * VW, (1 - v.y) * VH


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
        if nm in ('bins', 'binpapers'): ob['bins'] = 1
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
        table['hits'] = {k: box_of(cam, v) for k, v in desk.items()}
        table['plate'] = [round(c, 1) for c in to_screen(cam, (0, -14.6, -18.5))]   # the nameplate's middle
        table['bins'] = [round(c, 1) for c in to_screen(cam, (-52, 50, 18))]          # where papers fly out of the bins
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
