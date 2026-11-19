"""HANZ / $@L, THE TRUE SHOPKEEPER, as a real low-poly 3D model in Blender (`pip install bpy`, Blender 5.x).

The look: a few big flat angular planes (every part is the convex hull of a handful of points), thin black ink lines
on the silhouette and the sharp creases (Blender's Freestyle), bold flat colour per face lit in two hard steps, and
a speckled grain over everything (denser in the shadow).

Him: one lanky man split straight down the middle. $@L (the LEFT of the picture) is sneaky, quick to anger and
foolish: blood RED, with one curved devil horn. HANZ (the right) is tired, sad and smart: pale GREY. The split runs
through his face, his hands and the lining of his coat. His face is a big flat plate framed by black hair like a helmet, and on it is Mason's drawing
(tools/sprites/art/hanz_face.png, 64x64, black lines) as a pixel texture: $@L's heavy drooping eye, HANZ's beady eye
in spiral rings, a crooked grin across both. He wears a thick, heavy anime trench coat: a huge popped collar round
his head (lined red on $@L's side, grey on HANZ's), wide lapels, double-breasted buttons, a belt, epaulettes, wide
cuffs with straps. He's too calm: perfectly still, head a little tilted, leaning over a heavy old shop counter on
long arms with his hands flat on the wood.

Run:  python3 tools/sprites/hanz_3d.py --out DIR [--pose lean|stand]
      -> preview shots in DIR (game.png = framed like the LOST room, 640x360) and the scene saved as
         tools/sprites/art/hanz.blend for opening in Blender.
"""
import os, sys, math, argparse
import numpy as np
from PIL import Image
from scipy.spatial import ConvexHull
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(__file__)
FACE = os.path.join(HERE, 'art', 'hanz_face.png')
BLEND = os.path.join(HERE, 'art', 'hanz.blend')

# ------------------------------------------------------------------ colours (bold and flat, one per face)
SAL_SKIN = 0xb8121c; SAL_SKIN_D = 0x860a12   # $@L (LEFT of the picture): blood red
HANZ_SKIN = 0xd2d0cc; HANZ_SKIN_D = 0xa8a6a2 # HANZ (right of the picture): pale, drained of colour
HORN = 0x6e0810; HORN2 = 0x9a1018           # $@L's devil horn: dark blood red
COAT = 0x24232b; COAT2 = 0x302f39; COAT3 = 0x18171e   # the trench coat: heavy charcoal
BELT = 0x161519; BRASS = 0xc8a040; BRASS2 = 0x8a6a28
HAIR = 0x101013
WOOD = 0x6a4028; WOOD2 = 0x80502e; WOOD3 = 0x4a2c1c
CLOCK = 0xe8e0c8; GREEN = 0x3a6a4a; INKC = 0x101012
HEART = 0x7a0610; HEART2 = 0x9a0a18; BLOOD = 0x4a0008          # his clock-heart: wet dark red, and what drips off it
CAVITY = 0x1a0406                                              # inside the hatch in his chest (a faint red glow)
BOOK1 = 0x5a2a3a; BOOK2 = 0x2a4a5a; PAGES = 0xe8dcc0           # the old books under the lava lamp
WAX = 0xf0e4c8; GLASS = 0xcfe0e8; SAND = 0xd8b070               # the candle's wax, the hourglass's glass and its sand
CHROME = 0x8a8a96; LAVA_GLASS = 0x8a2a6a; LAVA_WAX = 0xff7a30   # the lava lamp: its metal, its liquid, its wax
INK = (0.0, 0.0, 0.0)

# ------------------------------------------------------------------ building meshes
class Mesh:
    """A part being built: vertices (Blender axes: x right, y away from the camera, z up), polygons, a colour per
    polygon, and which polygons carry the face texture (with their UVs)."""
    def __init__(self):
        self.v, self.f, self.c, self.uv = [], [], [], {}

    def hull(self, pts, col, M=None, split=None, uvface=None):
        """The convex hull of pts (a hard-faceted solid). col = a colour, or colfn(centroid, normal) -> colour.
        M = a 4x4 transform applied to the points. Neighbouring coplanar triangles are merged so Freestyle doesn't
        draw lines across flat faces. uvface(centroid, normal) -> True puts the face texture on that polygon."""
        P = np.array(pts, float)
        if M is not None: P = np.array([(M @ Vector(p)).to_tuple() for p in P])
        h = ConvexHull(P)
        o = len(self.v); self.v += [tuple(p) for p in P]
        ctr = P.mean(0)
        for tri, eq in zip(h.simplices, h.equations):
            a, b, c = P[tri]
            n = eq[:3]
            if np.dot(np.cross(b - a, c - a), n) < 0: tri = tri[[0, 2, 1]]          # (wind outward)
            cen = P[tri].mean(0)
            self.f.append([o + int(i) for i in tri])
            self.c.append(col(cen, n) if callable(col) else col)
            if uvface and uvface(cen, n): self.uv[len(self.f) - 1] = True

    def box(self, c, s, col, M=None):
        """A box centred on c with size s (x, y, z), as a hull."""
        x, y, z = c; a, b, d = s[0] / 2, s[1] / 2, s[2] / 2
        self.hull([(x + i * a, y + j * b, z + k * d) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)], col, M)

    def limb(self, p0, p1, r0, r1, col, sides=4, twist=0.0, M=None):
        """An angular limb: a hull of two n-gon rings from p0 to p1 (4 sides = a hard square sleeve)."""
        p0, p1 = np.array(p0, float), np.array(p1, float)
        d = p1 - p0; d /= np.linalg.norm(d)
        u = np.cross(d, (0, 0, 1)); u = u / np.linalg.norm(u) if np.linalg.norm(u) > 1e-3 else np.array((1, 0, 0))
        w = np.cross(d, u)
        pts = []
        for p, r in ((p0, r0), (p1, r1)):
            for k in range(sides):
                a = twist + 2 * math.pi * (k + 0.5) / sides
                pts.append(p + r * (math.cos(a) * u + math.sin(a) * w))
        self.hull(pts, col, M)

    def slab(self, pts2, y0, y1, col, M=None):
        """A flat cut-out shape (x, z points) given thickness from y0 to y1 - a lapel, a tie, a tag."""
        self.hull([(x, y, z) for x, z in pts2 for y in (y0, y1)], col, M)


def side(col_h, col_s, cut=0.0):
    """A colour function: $@L's colour left of x=cut, HANZ's right of it."""
    return lambda c, n: col_h if c[0] < cut else col_s


# ------------------------------------------------------------------ him
FACE_X, FACE_Z = 18, (-23, 20)                    # the face plate: half its width, and its bottom / top
HEAD_SCALE = 0.8                                  # the head's size on his body
FACE_SPLIT = 31                                   # the drawing's column between his two eyes = where red turns grey
# the face texture's straight front projection (x0, x1, z0, z1 = where u / v run 0..1): column FACE_SPLIT lands on
# x = 0, the plate's edges on the drawing's edges, its top / bottom on rows 2 / 52 (so the whole grin fits on it)
FACE_UV = (-FACE_X, FACE_X * (64 - FACE_SPLIT) / FACE_SPLIT, FACE_Z[1] - 62 * (FACE_Z[1] - FACE_Z[0]) / 50, FACE_Z[1] + 2 * (FACE_Z[1] - FACE_Z[0]) / 50)


def head():
    """His head, as two meshes. 'face': a big flat face plate (Mason's drawing covers its whole front, red left, grey
    right) on a shallow head. 'hair': glossy black anime hair framing it like a helmet - a faceted dome, a fringe of
    five uneven points over the brow, two locks down each side, spikes flaring off the back, a cowlick of two shards;
    'horn': $@L's curved devil horn."""
    face, hair = Mesh(), Mesh()
    z0, z1 = FACE_Z
    front = [(-FACE_X, -11, z1), (FACE_X, -11, z1), (-FACE_X - 1.5, -11, 4), (FACE_X + 1.5, -11, 4),
             (-17, -11, -12), (17, -11, -12), (-9, -10, z0), (9, -10, z0)]
    back = [(x * 0.88, 9, z * 0.9) for x, _, z in front]
    face.hull(front + back, lambda c, n: (SAL_SKIN if c[0] < 0 else HANZ_SKIN), uvface=lambda c, n: n[1] < -0.9)
    # the cap: a low faceted dome over the plate, then spikes - a heavy fringe of five uneven points over the brow, two
    # locks down each side to the jaw, a flare of spikes off the back, and the cowlick
    cap = [(23 * math.cos(a) * math.cos(e), -1.5 + 12.5 * math.sin(a) * math.cos(e), 18 + 13 * math.sin(e))
           for a in np.linspace(0, 2 * math.pi, 11)[:-1] for e in (0, 0.45, 0.9, 1.35)]
    hair.hull(cap, HAIR)
    for (x, w, tipx, tipz) in ((-17, 8, -15, 9), (-9, 8, -8, 6), (-1, 8, 1, 10), (7, 8, 9, 5), (15, 8, 17, 12)):
        hair.hull([(x - w / 2, -15, 22), (x + w / 2, -15, 22), (x - w / 2, -11, 24), (x + w / 2, -11, 24),
                   (x, -13, 27), (tipx, -15.2, tipz), (tipx, -13, tipz)], HAIR)
    for sx in (-1, 1):
        for (y, ztip, out) in ((-11, -8, 0.5), (-3, -1, -0.5)):
            hair.hull([(sx * 20, y - 4, 22), (sx * 24.5, y - 4, 21), (sx * 20, y + 4, 22), (sx * 24.5, y + 4, 21),
                       (sx * 20.5, y, 4), (sx * (21 + out), y - 1, ztip), (sx * 20.5, y + 1, ztip + 2)], HAIR)
    for (x, tz, ty) in ((-14, 14, 13), (-5, 20, 14), (5, 18, 13.5), (14, 12, 13)):
        hair.hull([(x - 5, 7, 26), (x + 5, 7, 26), (x - 5, 10, 12), (x + 5, 10, 12), (x + 2, ty, tz)], HAIR)
    hair.hull([(-19, 6, 24), (19, 6, 24), (-17, 11, -2), (17, 11, -2), (-17, 12, 18), (17, 12, 18)], HAIR)
    hair.hull([(2, -6, 29), (8, -4, 29), (5, 4, 29), (11, -9, 39)], HAIR)        # the cowlick
    hair.hull([(6, -3, 29), (11, -1, 29), (8, 6, 29), (16, -2, 35)], HAIR)
    # $@L's devil horn: rising out of the hair on his (left) side, curving up and out to a point (segments taper)
    horn = Mesh()
    path = [(-14, -2, 24), (-17, -2.5, 28), (-19.5, -3, 32), (-22, -3.6, 37), (-24, -4.2, 41.5), (-25, -5, 46), (-24.6, -5.6, 49.5), (-23.6, -6, 52)]
    rad = [4.3, 3.9, 3.4, 2.8, 2.1, 1.4, 0.8, 0.15]
    for i in range(len(path) - 1):
        horn.limb(path[i], path[i + 1], rad[i], rad[i + 1], HORN if i < 3 else HORN2, sides=10, twist=0.3)
    return {'face': face, 'hair': hair, 'horn': horn}


HATCH = (6.8, 12.2, 22.5, 31.5, -12.62)         # the chest hatch on the right lapel: x0, x1, z0, z1, the lapel's face (y)


def coat(M, hatch=0.0):
    """His chest and shoulders in the thick trench coat, as meshes: 'torso' (a narrow lanky body, wide lapels, two
    rows of brass buttons, a belt and buckle, epaulettes, the skirt flaring below the belt), 'collar_l' / 'collar_r'
    (the huge popped collar: two thick walls flaring out round his head, lined red on $@L's side and grey on HANZ's),
    'neck'."""
    torso, neck = Mesh(), Mesh()
    pts = []
    for z, w, d in ((-30, 19, 11), (0, 14, 8.5), (14, 13, 8.5), (32, 17, 9.5), (40, 22, 9.5), (45, 18, 8)):
        pts += [(x, y, z) for x in (-w, w) for y in (-d, d)]
    torso.hull(pts, lambda c, n: COAT2 if n[1] < -0.5 else COAT, M)
    torso.slab([(-3, 40), (-16, 39), (-11, 21), (2, 11)], -11.5, -9.6, COAT2, M)       # lapels, crossing for the double breast
    torso.slab([(3, 40), (16, 39), (11, 21), (-1, 11)], -12.6, -10.7, COAT2, M)
    torso.slab([(-4, 39.5), (4, 39.5), (2, 32), (-2, 32)], -10.9, -9.4, COAT3, M)        # the dark opening at the throat
    for bx in (-5.5, 5.5):
        for bz in (27, 20):
            torso.box((bx, -12.7, bz), (2.2, 1.0, 2.2), BRASS, M)
    torso.hull([(x, y, z) for x in (-15, 15) for y in (-10, 10) for z in (6, 11)], BELT, M)
    torso.box((0, -10.8, 8.5), (6, 1.4, 6), BRASS, M); torso.box((0, -11.2, 8.5), (3, 1.2, 3), BELT, M)
    for sx in (-1, 1):
        torso.slab([(sx * 10, 45.5), (sx * 22, 41.5), (sx * 22, 39.8), (sx * 10, 43.8)], -5, 5, COAT3, M)   # epaulettes
    neck.limb((0, 1, 40), (0, 1, 52), 5, 4.5, lambda c, n: SAL_SKIN_D if c[0] < 0 else HANZ_SKIN_D, sides=8, M=M)
    out = {'torso': torso, 'neck': neck}
    # the little hatch in HANZ's side of his chest, cut into the lapel: closed it lies flush (brass hinges on its outer
    # edge, a keyhole); hatch = how far it's swung open (degrees). Behind it, a dark hollow that glows faintly red.
    cav, hat = Mesh(), Mesh()
    X0, X1, Z0, Z1, YF = HATCH
    cav.slab([(X0 + 0.5, Z0 + 0.5), (X1 - 0.5, Z0 + 0.5), (X1 - 0.5, Z1 - 0.5), (X0 + 0.5, Z1 - 0.5)], YF - 0.12, YF + 0.05, CAVITY, M)
    Hm = M @ T(X1, YF, 0) @ T(rz=hatch) @ T(-X1, -YF, 0)                  # (swings out toward you on its hinges)
    hat.slab([(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1)], YF - 0.9, YF - 0.15, COAT2, Hm)
    hat.box((X0 + 1.4, YF - 1.05, (Z0 + Z1) / 2), (0.9, 0.4, 1.8), BELT, Hm)                       # the keyhole
    for z in (Z0 + 1.6, Z1 - 1.6): hat.box((X1 + 0.1, YF - 0.6, z), (1.2, 1.3, 2.0), BRASS, M)  # hinges (they stay put)
    out['cavity'] = cav; out['hatch'] = hat
    for sx, nm in ((-1, 'collar_l'), (1, 'collar_r')):
        lining = SAL_SKIN_D if sx < 0 else HANZ_SKIN_D
        col = Mesh()
        fn = lambda c, n, sx=sx, lining=lining: lining if n[0] * sx < -0.3 else COAT
        # a narrow band standing up round the neck (clear of the shoulders), then the big flared top above shoulder height
        col.hull([(sx * 8, -8, 40), (sx * 8, 7, 42), (sx * 14, -7, 42), (sx * 14, 7, 42),
                  (sx * 15.5, -8, 51), (sx * 15.5, 7, 52), (sx * 19.5, -8, 51), (sx * 19.5, 7, 52)], fn, M)
        col.hull([(sx * 15.5, -8, 50.5), (sx * 15.5, 7, 51.5), (sx * 19.5, -8, 50.5), (sx * 19.5, 7, 51.5),
                  (sx * 28, -6, 62), (sx * 35, -9, 64), (sx * 34, 7, 63), (sx * 27, 6, 63)], fn, M)
        out[nm] = col
    return out


def arm(s, shoulder, elbow, wrist, hand_dir):
    """One long arm, as meshes: 'sleeve' (a sloped shoulder, a wide trench sleeve flaring at the cuff, a strap round
    the cuff) and 'hand' (a big long-fingered hand lying flat, red for $@L (s = -1), grey for HANZ (s = +1))."""
    sl, hd = Mesh(), Mesh()
    skin, skin_d = (SAL_SKIN, SAL_SKIN_D) if s < 0 else (HANZ_SKIN, HANZ_SKIN_D)
    x, y, z = shoulder
    sl.hull([(x - s * 4, y - 8, z + 4), (x - s * 4, y + 8, z + 4), (x + s * 8, y - 8, z - 3), (x + s * 8, y + 8, z - 3),
             (x - s * 4, y - 7, z - 6), (x - s * 4, y + 7, z - 6), (x + s * 7, y - 7, z - 9), (x + s * 7, y + 7, z - 9)], COAT)
    sl.limb(shoulder, elbow, 7, 6.5, COAT, sides=5, twist=0.4)
    e, w = np.array(elbow, float), np.array(wrist, float)
    cuff = e + (w - e) * 0.84
    sl.limb(elbow, tuple(cuff), 6.5, 8, COAT2, sides=5, twist=0.2)
    sl.limb(tuple(e + (w - e) * 0.68), tuple(e + (w - e) * 0.76), 8.0, 8.2, BELT, sides=5, twist=0.2)   # the cuff strap
    hd.limb(tuple(cuff), wrist, 3.4, 3.4, skin_d, sides=4)
    d = np.array(hand_dir, float); d /= np.linalg.norm(d)
    u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u)
    palm_end = w + d * 12
    hd.hull([tuple(p + u * a + np.array((0, 0, zz))) for p in (w, palm_end) for a in (-6, 6) for zz in (-1.8, 1.8)], skin)
    for i, a in enumerate((-4.6, -1.5, 1.5, 4.6)):                                   # long fingers lying flat on the wood
        base = palm_end + u * a
        tip = base + d * (12 + (2 if i in (1, 2) else 0)) + u * a * 0.3 + np.array((0, 0, -0.6))
        hd.limb(tuple(base), tuple(tip), 1.7, 1.4, skin, sides=4)
    hd.limb(tuple(w + u * 6 * -s + d * 2), tuple(w + u * 12 * -s + d * 7 + np.array((0, 0, -0.5))), 2.0, 1.6, skin_d, sides=4)
    return {'sleeve': sl, 'hand': hd}


def heart(clock=(0.0, 0.0), drips=()):
    """His heart, wound into a clock: a wet, dark-red low-poly heart (two lobes, the apex, its vessels), a brass-rimmed
    clock face set into its front (clock = the hour / minute hands' angles, degrees, 0 = twelve), a little gear
    poking out of the top, and drips hanging off it (drips = [(x, z, length)] in its own space). Its own space: z up,
    -y toward you, about 11 tall; the middle of the face at the origin."""
    m = Mesh()
    pts = []
    for cx in (-2.4, 2.4):
        pts += [(cx + 3 * math.cos(a) * math.cos(e), 2.2 * math.sin(a) * math.cos(e), 1.8 + 3 * math.sin(e))
                for a in np.linspace(0, 2 * math.pi, 9)[:-1] for e in (-0.6, 0, 0.6, 1.2)]
    pts += [(0.6, 0, -6.2), (0.2, -1.2, -4.8), (1.2, 1.0, -4.8)]
    m.hull(pts, lambda c, n: HEART if n[2] > -0.4 else HEART2)
    for (p0, p1, r0, r1) in (((0.8, 0.4, 3.5), (1.6, 0.8, 7.2), 1.4, 1.1), ((-1.6, 0.6, 3.6), (-2.6, 1.2, 6.2), 0.9, 0.7),
                             ((2.8, 0.8, 3.2), (4.2, 1.0, 5.4), 0.8, 0.6)):
        m.limb(p0, p1, r0, r1, HEART, sides=8)
        m.limb(p1, tuple(np.array(p1) + (0, 0, 0.4)), r1 * 1.25, r1 * 1.25, HEART2, sides=8)   # (a cut-off rim)
    # the clock: brass rim, cream face, hour marks, two black hands
    R = 2.7; cy = -2.5
    m.hull([(R * math.cos(a), cy + d, 0.4 + R * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 17)[:-1] for d in (-0.5, 0.6)], BRASS)
    m.hull([(0.86 * R * math.cos(a), cy - 0.62 + d, 0.4 + 0.86 * R * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 17)[:-1] for d in (0, 0.15)], CLOCK)
    for k in range(12):
        a = 2 * math.pi * k / 12
        m.box((0.7 * R * math.sin(a), cy - 0.82, 0.4 + 0.7 * R * math.cos(a)), (0.32, 0.12, 0.32), INKC)
    for ang, ln, wd in ((clock[0], 1.2, 0.34), (clock[1], 1.9, 0.22)):
        a = math.radians(ang)
        tip = (ln * math.sin(a), cy - 0.92, 0.4 + ln * math.cos(a))
        m.hull([(0.18 * math.cos(a) - wd / 2 * math.cos(a), cy - 0.88, 0.4 - 0.18 * math.sin(a)), tip,
                (-wd / 2 * math.cos(a), cy - 1.0, 0.4 + wd / 2 * math.sin(a)), (wd / 2 * math.cos(a), cy - 0.88, 0.4 - wd / 2 * math.sin(a))], INKC)
    m.box((0, cy - 0.95, 0.4), (0.4, 0.15, 0.4), BRASS)
    # a gear poking out of the top, between the lobes
    gear = [(0.1 + 1.6 * math.cos(a) * (1.25 if k % 2 else 1), 0.3 + d, 4.6 + 1.6 * math.sin(a) * (1.25 if k % 2 else 1))
            for k, a in enumerate(np.linspace(0, 2 * math.pi, 17)[:-1]) for d in (-0.3, 0.3)]
    m.hull(gear, BRASS2)
    for (x, z, ln) in drips:                                                       # drips: a bead stretching down
        m.hull([(x + 0.55 * math.cos(a), 0.2 + 0.55 * math.sin(a) - 0.3, z) for a in np.linspace(0, 2 * math.pi, 7)[:-1]]
               + [(x, -0.1, z - ln), (x + 0.3, 0, z - ln * 0.7), (x - 0.3, 0, z - ln * 0.7)], BLOOD)
    return m


def drop(p, r=0.7, stretch=1.6):
    """One falling drop of his blood at p (world): a little bead pulled long as it falls."""
    m = Mesh()
    x, y, z = p
    m.hull([(x + r * math.cos(a) * math.cos(e), y + r * math.sin(a) * math.cos(e), z + r * math.sin(e) * (stretch if e > 0 else 1))
            for a in np.linspace(0, 2 * math.pi, 9)[:-1] for e in (-1.2, -0.5, 0, 0.6, 1.2)], BLOOD)
    return m


def props():
    """The things on his desk that move, as {name: (Mesh, (x, y) where it stands)}: built at rest here, animated by
    hanz_anim.py. 'lava' = a lava lamp (chrome base and cap, glowing liquid in a tall tapered glass; its wax is
    metaballs, added there) standing on two old books; 'hourglass' = a wooden hourglass whose sand falls UP (glass,
    frame - the sand is added there); 'candle' = a fat candle melting all over a brass dish (its flame is added there)."""
    out = {}
    lx, ly, base = LAVA
    m = Mesh()
    ring = lambda r, z: [(lx + r * math.cos(a), ly + r * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 17)[:-1]]
    m.hull(ring(5.2, base) + ring(3.6, base + 6.5), CHROME)                      # the base (a cone)
    m.hull(ring(3.0, base + 6.0) + ring(4.2, base + 15) + ring(3.3, base + 25) + ring(1.9, base + 31), LAVA_GLASS)  # the glass
    m.hull(ring(2.0, base + 30.5) + ring(1.1, base + 35), CHROME)                # the cap
    out['lava'] = m
    b = Mesh()
    b.box((lx, ly, 1.75), (20, 15, 2.5), BOOK1, T(rz=4)); b.box((lx, ly - 7.6, 1.75), (19.4, 0.4, 2.1), PAGES, T(rz=4))
    b.box((lx + 0.8, ly + 0.5, 4.6), (18, 13, 3.0), BOOK2, T(rz=-7)); b.box((lx + 0.8, ly - 6.2, 4.6), (17.4, 0.4, 2.6), PAGES, T(rz=-7))
    out['books'] = b
    hx_, hy, hz = HOURGLASS
    h = Mesh()
    disc = lambda r, z0, z1: [(hx_ + r * math.cos(a), hy + r * math.sin(a), hz + z) for a in np.linspace(0, 2 * math.pi, 13)[:-1] for z in (z0, z1)]
    h.box((hx_, hy, hz - 1.8), (11, 11, 4.6), WOOD3)                              # (a little block levelling it on the till's slope)
    h.hull(disc(5, 0.5, 2.2), WOOD2); h.hull(disc(5, 18.8, 20.5), WOOD2)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        h.limb((hx_ + 4.1 * math.cos(a), hy + 4.1 * math.sin(a), hz + 2.2), (hx_ + 4.1 * math.cos(a), hy + 4.1 * math.sin(a), hz + 18.8), 0.55, 0.55, WOOD, sides=8)
    out['hourglass'] = h
    g = Mesh()
    bulb = lambda zc, flip: [(hx_ + r * math.cos(a), hy + r * math.sin(a), hz + zc + flip * dz) for a in np.linspace(0, 2 * math.pi, 13)[:-1]
                             for r, dz in ((0.45, 7.6), (2.6, 5.2), (3.3, 2.6), (3.0, 0.3))]
    g.hull(bulb(10.5, 1) + [(hx_, hy, hz + 18.5)], GLASS); g.hull(bulb(10.5, -1) + [(hx_, hy, hz + 2.5)], GLASS)
    out['hourglass_glass'] = g
    cx_, cy_ = CANDLE
    c = Mesh()
    c.hull([(cx_ + 6 * math.cos(a), cy_ + 6 * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 17)[:-1] for z in (0.5, 1.6)], BRASS)
    c.hull([(cx_ + r * math.cos(a), cy_ + r * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 13)[:-1] for r, z in ((2.6, 1.6), (2.5, 9.5), (2.0, 11.2))], WAX)
    rng = np.random.default_rng(5)
    for k in range(7):                                                             # wax running down it, pooling over the dish
        a = 2 * math.pi * k / 7 + rng.uniform(0, 0.4); z0 = rng.uniform(5, 10.5); r = 2.55
        x, y = cx_ + r * math.cos(a), cy_ + r * math.sin(a)
        c.limb((x, y, z0), (x, y, 1.8), 0.5, 0.7, WAX, sides=8)
    c.hull([(cx_ + 5 * math.cos(a) + 1.5, cy_ + 3.5 * math.sin(a) - 1, z) for a in np.linspace(0, 2 * math.pi, 13)[:-1] for z in (1.6, 2.0)], WAX)
    c.hull([(cx_ + 4.5 + 0.8 * math.cos(a), cy_ - 4 + 0.8 * math.sin(a), 1.8) for a in np.linspace(0, 2 * math.pi, 7)[:-1]]
           + [(cx_ + 5.2, cy_ - 6.8, -3.5), (cx_ + 5.0, cy_ - 6.6, -1)], WAX)    # one drip over the dish's edge and off the counter
    c.limb((cx_, cy_, 11), (cx_ + 0.2, cy_, 12.6), 0.18, 0.15, INKC, sides=6)   # the wick
    out['candle'] = c
    return out


LAVA = (-62, 12, 6.1)          # the lava lamp: where it stands (x, y) and its base's height (on the two books)
HOURGLASS = (65, 14, 26)       # the hourglass, standing on top of the old till (x, y, the height it stands at)
CANDLE = (66, -12)             # the candle on its dish, in front of the till


def counter():
    """His shop counter, as meshes: 'counter' (a heavy wooden top, its lip, the body with raised boards), 'bell' (brass),
    'till' (an old till) and 'watch' (a pocket watch melting over the front edge - one of the dream's melting things)."""
    m = Mesh()
    m.box((0, 0, -2), (150, 44, 5), WOOD2)                                       # the top (its surface at z = 0.5)
    m.box((0, -20, -6), (154, 6, 4), WOOD)                                        # its front lip
    m.box((0, 0, -40), (144, 38, 70), WOOD3)                                      # the body
    m.box((0, 21, 4), (150, 3, 8), WOOD)                                           # a raised rail along the back edge (he's behind it)
    m.box((0, 21, 8.5), (152, 4, 1.5), WOOD2)
    for i in range(-2, 3):                                                         # raised boards on the front
        m.box((i * 27, -19.5, -40), (23, 1.5, 58), WOOD if i % 2 else WOOD2)
    bell = Mesh()
    bx, by = -40, 12
    bell.hull([(bx + 6 * math.cos(a), by + 6 * math.sin(a), 0.6) for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
              + [(bx + 3 * math.cos(a), by + 3 * math.sin(a), 6) for a in np.linspace(0, 2 * math.pi, 7)[:-1]], BRASS)
    bell.box((bx, by, 7.5), (1.6, 1.6, 3), BRASS2)
    till = Mesh()
    till.hull([(56, 0, 0.6), (74, 0, 0.6), (56, 20, 0.6), (74, 20, 0.6), (58, 7, 22), (72, 7, 22), (58, 20, 26), (72, 20, 26)], GREEN)
    for i in range(3):
        for j in range(3):
            till.box((60 + i * 5, 3 + j * 3, 6 + j * 4), (3.4, 2.5, 1.6), CLOCK)
    till.slab([(59, 26), (71, 26), (71, 32), (59, 32)], 15, 16.5, CLOCK)
    watch = Mesh()
    WX = -52
    rim = []
    for k in range(10):
        a = 2 * math.pi * k / 10
        x, y = 13 * math.cos(a), 9 * math.sin(a) - 12
        z = 1.2
        if y < -17: z = 1.2 - (abs(y) - 17) * 3; y = -23.6                       # (the part past the edge hangs down the lip)
        rim.append((x + WX, y, z))
    watch.hull(rim + [(p[0], p[1] - (0.8 if p[1] < -20 else 0), p[2] + 1.4) for p in rim], CLOCK)
    watch.hull([(WX - 6, -24.6, -6), (WX + 4, -24.6, -6), (WX - 2, -25.2, -20), (WX - 1, -24.4, -26), (WX, -25, -14)], CLOCK)   # the drip
    for k in range(12):                                                             # hour marks (the ones past the edge slide down with it)
        a = 2 * math.pi * k / 12; x, y = WX + 10 * math.cos(a), 7 * math.sin(a) - 12
        zz = 2.9
        if y < -17: zz = 2.9 - (abs(y) - 17) * 3; y = -25.2
        watch.box((x, y, zz), (1.4, 1.4, 0.6), INKC)
    watch.box((WX + 3, -12, 3.1), (7, 1, 0.6), INKC); watch.box((WX - 0.5, -9.5, 3.1), (1, 5, 0.6), INKC)   # its hands
    return {'counter': m, 'bell': bell, 'till': till, 'watch': watch}


INKC = 0x101012


# ------------------------------------------------------------------ Blender scene: a real lit render
# what each colour is made of (its material): the colour stays the face's own colour, the material says how light
# treats it - matte heavy cloth, soft skin, glossy hair and horn, polished brass, varnished wood...
KINDS = {
    'skin': (SAL_SKIN, SAL_SKIN_D, HANZ_SKIN, HANZ_SKIN_D),
    'cloth': (COAT, COAT2, COAT3),
    'leather': (BELT,),
    'metal': (BRASS, BRASS2),
    'hair': (HAIR,),
    'horn': (HORN, HORN2),
    'wood': (WOOD, WOOD2, WOOD3),
    'ceramic': (CLOCK,),
    'paint': (GREEN,),
    'wet': (HEART, HEART2, BLOOD),
    'cavity': (CAVITY,),
    'book': (BOOK1, BOOK2),
    'paper': (PAGES,),
    'wax': (WAX,),
    'glass': (GLASS,),
    'sand': (SAND,),
    'chrome': (CHROME,),
    'lavaglass': (LAVA_GLASS,),
    'lavawax': (LAVA_WAX,),
}
# how each material catches the light: roughness, metallic, clearcoat, sheen, subsurface
LOOK = {'skin': (0.48, 0, 0.0, 0, 0.12), 'cloth': (0.86, 0, 0, 0.35, 0), 'leather': (0.38, 0, 0.2, 0, 0),
        'metal': (0.28, 1, 0, 0, 0), 'hair': (0.3, 0, 0.25, 0, 0), 'horn': (0.22, 0, 0.6, 0, 0),
        'wood': (0.42, 0, 0.35, 0, 0), 'ceramic': (0.22, 0, 0.3, 0, 0), 'paint': (0.32, 0.25, 0.2, 0, 0),
        'wet': (0.12, 0, 1.0, 0, 0.2), 'cavity': (0.6, 0, 0, 0, 0), 'book': (0.62, 0, 0.1, 0.2, 0),
        'paper': (0.8, 0, 0, 0, 0), 'wax': (0.35, 0, 0, 0, 0.5), 'glass': (0.02, 0, 0, 0, 0), 'sand': (0.9, 0, 0, 0, 0),
        'chrome': (0.15, 1, 0, 0, 0), 'lavaglass': (0.05, 0, 0.5, 0, 0), 'lavawax': (0.3, 0, 0, 0, 0),
        'plain': (0.55, 0, 0, 0, 0)}
# what glows, and how bright: the hatch's insides, the lava lamp's liquid and wax
GLOW = {'cavity': ((1.0, 0.08, 0.06), 1.6), 'lavaglass': ((0.85, 0.2, 0.6), 0.25), 'lavawax': ((1.0, 0.42, 0.1), 9.0)}
# which parts are smooth-shaded (skin, horn) and which keep crisp folds; the angle (degrees) above which an edge stays sharp
SMOOTH = {'hand': 70, 'neck': 70, 'horn': 70, 'heart': 70, 'drop': 80, 'lava': 80, 'candle': 80, 'hourglass': 80, 'sand': 80}
SHARP_ANGLE = 32


def kind_of(rgb):
    """Which material a colour is (KINDS), 'plain' if none."""
    for k, cols in KINDS.items():
        if rgb in cols: return k
    return 'plain'


def principled(name, base=None, look='plain'):
    """A real surface: Principled BSDF lit by the scene's lights. base = a colour socket (else the mesh's own per-face
    colour 'Col'); look = a LOOK entry. Wood gets a grain, cloth a faint weave in its bump."""
    rough, metal, coat, sheen, sss = LOOK[look]
    mt = bpy.data.materials.new(name); mt.use_nodes = True
    nt = mt.node_tree; nt.nodes.clear(); L = nt.links
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    out = nt.nodes.new('ShaderNodeOutputMaterial'); L.new(bs.outputs[0], out.inputs['Surface'])
    if base is None:
        ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'; base = ca.outputs['Color']
    if look == 'wood':                                                            # long grain along x, darker streaks
        tc = nt.nodes.new('ShaderNodeTexCoord'); wv = nt.nodes.new('ShaderNodeTexWave')
        wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 0.08
        wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 3
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.15, 1, 1)
        L.new(tc.outputs['Object'], mp.inputs['Vector']); L.new(mp.outputs['Vector'], wv.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 0.72
        L.new(wv.outputs['Fac'], mr.inputs['Value'])
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
        L.new(base, mx.inputs[6]); L.new(mr.outputs['Result'], mx.inputs[7]); base = mx.outputs[2]
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
        L.new(wv.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bs.inputs['Normal'])
    if look == 'cloth':                                                           # a faint woollen weave
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.4
        L.new(tc.outputs['Object'], nz.inputs['Vector'])
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.12
        L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bs.inputs['Normal'])
    L.new(base, bs.inputs['Base Color'])
    if look in GLOW:
        col, st = GLOW[look]; bs.inputs['Emission Color'].default_value = col + (1,); bs.inputs['Emission Strength'].default_value = st
    if look in ('glass', 'lavaglass'):                                            # see-through (the lava lamp's liquid tinted)
        bs.inputs['Transmission Weight'].default_value = 1.0 if look == 'glass' else 0.85; bs.inputs['IOR'].default_value = 1.45 if look == 'glass' else 1.33
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    bs.inputs['Coat Weight'].default_value = coat; bs.inputs['Sheen Weight'].default_value = sheen
    if sss:
        bs.inputs['Subsurface Weight'].default_value = sss; bs.inputs['Subsurface Scale'].default_value = 0.6
    return mt


def materials(face_img=None):
    """All the materials, by name: one per LOOK, plus 'face' (Mason's drawing on the face plate, as skin) if face_img."""
    mats = {k: principled('m_' + k, look=k) for k in LOOK}
    if face_img:
        mt = principled('m_face', look='skin'); nt = mt.node_tree
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = face_img; tex.interpolation = 'Cubic'
        uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UV'; nt.links.new(uv.outputs['UV'], tex.inputs['Vector'])
        bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        nt.links.new(tex.outputs['Color'], bs.inputs['Base Color'])
        mats['face'] = mt
    return mats


def smooth_up(mask, k=16, blur=None, cut=0.5):
    """A pixel-art mask (bool array) scaled up k times with its stair-steps rounded off: each pixel becomes a k x k
    block, then the edges are blurred and cut at half - so Mason's lines come out as clean smooth strokes."""
    from scipy.ndimage import gaussian_filter
    big = np.kron(mask.astype(float), np.ones((k, k)))
    return gaussian_filter(big, blur or k * 0.5) > cut


def face_image(src=None, k=16):
    """Mason's face drawing over the split skin, as a smooth hi-res texture (k x the drawing): $@L's red left of
    FACE_SPLIT, HANZ's grey right of it, his black lines on top with their pixel steps rounded off. src = the drawing
    (RGBA array), FACE if None."""
    if src is None: src = np.array(Image.open(FACE).convert('RGBA'))
    H, W = src.shape[:2]
    img = np.zeros((H * k, W * k, 4), np.uint8); img[..., 3] = 255
    t = [SAL_SKIN >> 16 & 255, SAL_SKIN >> 8 & 255, SAL_SKIN & 255]; r = [HANZ_SKIN >> 16 & 255, HANZ_SKIN >> 8 & 255, HANZ_SKIN & 255]
    img[:, :FACE_SPLIT * k, :3] = t; img[:, FACE_SPLIT * k:, :3] = r
    img[smooth_up(src[..., 3] > 0, k, cut=0.36), :3] = (16, 14, 18)
    path = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_face_tex_%d.png' % id(src)); Image.fromarray(img).save(path)
    im = bpy.data.images.load(path); im.colorspace_settings.name = 'sRGB'
    return im


def to_object(name, m, mats, face_box=None, bevel=True):
    """Turns a Mesh into a Blender object: a colour per polygon, the material its colour is made of (KINDS), smooth
    shading with crisp creases (SMOOTH / SHARP_ANGLE), a small bevel on the hard edges so they catch the light, and
    for the head the face texture's UVs (a straight projection from the front over face_box = (x0, x1, z0, z1)).
    mats = materials() (a dict)."""
    me = bpy.data.meshes.new(name); me.from_pydata(m.v, [], m.f); me.update()
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    uvl = me.uv_layers.new(name='UV')
    order = list(mats.keys())
    for mt in mats.values(): me.materials.append(mt)
    for poly, rgb in zip(me.polygons, m.c):
        c = tuple(((rgb >> s & 255) / 255) ** 2.2 for s in (16, 8, 0)) + (1.0,)
        for li in poly.loop_indices:
            attr.data[li].color = c
            if face_box:
                x, _, z = m.v[me.loops[li].vertex_index]
                x0, x1, z0, z1 = face_box
                uvl.data[li].uv = ((x - x0) / (x1 - x0), (z - z0) / (z1 - z0))
        poly.use_smooth = True
        k = 'face' if (face_box and m.uv.get(poly.index) and 'face' in mats) else kind_of(rgb)
        poly.material_index = order.index(k)
    ang = next((a for key, a in SMOOTH.items() if key in name), SHARP_ANGLE)
    me.set_sharp_from_angle(angle=math.radians(ang))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    if bevel and ang == SHARP_ANGLE:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = 0.45; bv.segments = 2; bv.limit_method = 'ANGLE'
        bv.angle_limit = math.radians(SHARP_ANGLE); bv.harden_normals = False
    return ob


def lights():
    """The light in his room: a warm lamp-light key from high on the left, a cool dusk rim from behind on the right
    (it outlines his collar and horn), a soft lilac fill from the sky, and the room's peach-and-violet glow all round."""
    sc = bpy.context.scene
    w = bpy.data.worlds.new('dusk'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.42, 0.30, 0.42, 1); bg.inputs['Strength'].default_value = 0.35
    for nm, rot, col, en, ang in (('key', (52, 0, -32), (1.0, 0.82, 0.62), 3.4, 14),
                                  ('rim', (-62, 0, 145), (0.62, 0.66, 1.0), 4.0, 6),
                                  ('fill', (70, 0, 20), (0.85, 0.72, 0.95), 0.9, 30)):
        ld = bpy.data.lights.new(nm, 'SUN'); ld.color = col; ld.energy = en; ld.angle = math.radians(ang)
        ob = bpy.data.objects.new(nm, ld); sc.collection.objects.link(ob)
        ob.rotation_euler = tuple(math.radians(v) for v in rot)


def render_settings(samples=40):
    """Cycles, path traced: soft shadows, bounce light, denoised; transparent film so the game lays it over the room."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.03
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2; sc.cycles.glossy_bounces = 2; sc.cycles.transparent_max_bounces = 4
    sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
    sc.render.film_transparent = True; sc.render.use_freestyle = False
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'


def T(x=0, y=0, z=0, rx=0, ry=0, rz=0):
    """A transform: rotate (degrees, X then Y then Z) then move."""
    R = Matrix.Rotation(math.radians(rz), 4, 'Z') @ Matrix.Rotation(math.radians(ry), 4, 'Y') @ Matrix.Rotation(math.radians(rx), 4, 'X')
    return Matrix.Translation((x, y, z)) @ R


def build(pose='lean'):
    """The whole set: him (posed) behind the counter. pose: 'lean' = on his elbows on the counter, head forward
    looking at you; 'stand' = upright, arms down on the counter top."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    render_settings(); lights()
    mats = materials(face_image())
    lean = pose == 'lean'
    body = T(0, 42, -4, rx=38 if lean else 4)                                   # hips behind the counter, hunched over it toward you
    neck_top = body @ Vector((0, 1, 50))
    head_M = T(*neck_top) @ T(0, -4, 15, rx=4 if lean else 0, ry=-7) @ Matrix.Scale(HEAD_SCALE, 4)   # (perfectly calm, head tilted a little - just slightly off)
    for nm, m in coat(body).items(): to_object(nm, m, mats)
    for nm, m in head().items():                                                  # (built at rest, so the face UVs are a straight front projection)
        ob = to_object(nm, m, mats, face_box=FACE_UV if nm == 'face' else None); ob.matrix_world = head_M
    for s_ in (-1, 1):
        sh = body @ Vector((s_ * 24, 0, 41))
        if lean:
            el = Vector((s_ * 45, 2, 22)); wr = Vector((s_ * 28, -11, 2.9)); hdir = (-s_ * 0.18, -1, 0)   # hands flat and wide on the counter, elbows out
        else:
            el = body @ Vector((s_ * 31, 2, 14)); wr = Vector((s_ * 30, -8, 2.9)); hdir = (0, -1, 0)
        for nm, m in arm(s_, tuple(sh), tuple(el), tuple(wr), hdir).items():
            to_object(nm + ('_sal' if s_ < 0 else '_hanz'), m, mats)
    for nm, m in counter().items(): to_object(nm, m, mats)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50; cam.data.clip_end = 5000
    sc['mats'] = 1; build.mats = mats
    return cam, head_M


# pairs of pieces that must never pass through each other (the shoulder joins and the hair on the head are meant to
# overlap, so they're not listed)
NO_CLIP = [('horn', 'collar_r'), ('horn', 'collar_l'), ('horn', 'face'), ('hair', 'collar_l'), ('hair', 'collar_r'), ('face', 'collar_l'), ('face', 'collar_r'), ('hair', 'torso'),
           ('face', 'torso'), ('face', 'neck_x'), ('sleeve_sal', 'counter'), ('sleeve_hanz', 'counter'),
           ('hand_sal', 'counter'), ('hand_hanz', 'counter'), ('hand_sal', 'watch'), ('hand_sal', 'bell'),
           ('hand_hanz', 'till'), ('sleeve_hanz', 'till'), ('sleeve_sal', 'collar_l'), ('sleeve_hanz', 'collar_r'),
           ('sleeve_sal', 'hair'), ('sleeve_hanz', 'hair'), ('torso', 'counter'), ('collar_l', 'collar_r'),
           ('hand_sal', 'sleeve_hanz'), ('sleeve_sal', 'sleeve_hanz')]


def clip_check():
    """Lists every NO_CLIP pair whose meshes pass through each other (Blender BVH overlap). Returns the bad pairs."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get(); trees = {}
    def tree(n):
        if n not in trees:
            ob = bpy.data.objects.get(n)
            if not ob: return None
            me = ob.evaluated_get(dg).to_mesh(); mw = ob.matrix_world
            trees[n] = BVHTree.FromPolygons([mw @ v.co for v in me.vertices], [list(p.vertices) for p in me.polygons])
        return trees[n]
    bad = []
    for a_, b_ in NO_CLIP:
        ta, tb = tree(a_), tree(b_)
        if ta and tb and ta.overlap(tb): bad.append((a_, b_, len(ta.overlap(tb))))
    return bad


def shot(cam, path, w, h, loc, target, lens=50):
    """Renders one view: camera at loc looking at target."""
    sc = bpy.context.scene; sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    cam.location = loc; cam.data.lens = lens
    d = Vector(target) - Vector(loc); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--pose', default='lean')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    cam, hm = build(a.pose)
    print('CLIPPING:', clip_check() or 'none')
    face = hm @ Vector((0, 0, 0))
    shot(cam, os.path.join(a.out, 'front.png'), 480, 480, (0, -240, 70), (0, 0, 22), 50)
    shot(cam, os.path.join(a.out, 'close.png'), 400, 400, (0, -120, face.z + 8), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'hanz.png'), 400, 400, (-95, -95, face.z + 10), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'sal.png'), 400, 400, (95, -95, face.z + 10), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'wide.png'), 640, 360, (-120, -300, 120), (0, 0, 20), 45)
    shot(cam, os.path.join(a.out, 'game.png'), 640, 360, (0, -215, 78), (0, 0, 36), 36)        # (how the LOST room frames him)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
