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
COAT = 0x1a1a23; COAT2 = 0x292935; COAT3 = 0x0f0f15   # the trench coat: noir - near-black with a cold blue tint
TROUSER = 0x34343e                                     # his trousers (only seen when his feet are up)
SHOE_SAL = 0x7a0a12; SHOE_HANZ = 0xb4b2ae; SOLE = 0x8a6a4a   # his shoes: one red, one grey (like the rest of him), worn tan leather soles
BUTTON = 0x2e2a2a                                      # its dark horn buttons (a spy's coat: nothing that glints)
BELT = 0x161519; BRASS = 0xc8a040; BRASS2 = 0x8a6a28
HAIR = 0x101013
WOOD = 0x6a4028; WOOD2 = 0x80502e; WOOD3 = 0x4a2c1c
CLOCK = 0xe8e0c8; GREEN = 0x3a6a4a; INKC = 0x101012
HEART = 0x7a0610; HEART2 = 0x9a0a18; BLOOD = 0x4a0008          # his clock-heart: wet dark red, and what drips off it
CAVITY = 0x5a0a0c                                              # inside the hatch in his chest (a faint red glow)
VOID = 0x07050a; VOID_EYE = 0xfff4e0                            # behind his mask: nothing - and two pinprick eyes
BOOK1 = 0x5a2a3a; BOOK2 = 0x2a4a5a; PAGES = 0xe8dcc0           # the old books under the lava lamp
WAX = 0xf0e4c8; GLASS = 0xcfe0e8; SAND = 0xf0c060               # the candle's wax, the hourglass's glass and its sand
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
    # the face is a MASK - a thick plate over the front (it comes off: the 'unmask' animation) - and behind it the
    # skull: nothing, black, with two pinprick eyes in it
    plate = [(x, -7.6, z) for x, _, z in front]
    face.hull(front + plate, lambda c, n: (SAL_SKIN if c[0] < 0 else HANZ_SKIN), uvface=lambda c, n: n[1] < -0.9)
    skull = Mesh()
    back = [(x * 0.88, 9, z * 0.9) for x, _, z in front]
    skull.hull([(x * 0.93, -7.2, z * 0.93) for x, _, z in front] + back, VOID)
    for ex in (-7, 7): skull.box((ex, -7.35, 5), (1.6, 0.4, 1.3), VOID_EYE)
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
    return {'face': face, 'skull': skull, 'hair': hair, 'horn': horn}


HATCH = (6.8, 12.2, 22.5, 31.5, -12.62)         # the chest hatch on the right lapel: x0, x1, z0, z1, the lapel's face (y)


def coat(M, hatch=0.0, collar=0.0):
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
            torso.box((bx, -12.7, bz), (2.2, 1.0, 2.2), BUTTON, M)
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
    # the collar: a tall funnel RING standing up all round his neck, like a spy's turned-up trench collar - flaring
    # out toward the top, low at the front (under his chin) and high at the back; lined red on $@L's side and grey
    # on HANZ's. Two halves (collar_l / collar_r) meeting at the back, a thin gap at the throat. Built of short
    # convex segments (a ring isn't convex). collar > 0 pushes its top out and down so his arms can reach his face.
    for sx, nm in ((-1, 'collar_l'), (1, 'collar_r')):
        lining = SAL_SKIN_D if sx < 0 else HANZ_SKIN_D
        col = Mesh()
        th = np.linspace(0.16, math.pi - 0.05, RING_SEGS + 1)
        for a0, a1 in zip(th[:-1], th[1:]):
            pts = []
            for a in (a0, a1):
                k = math.sqrt((1 - math.cos(a)) / 2)                             # (0 at the throat, ~0.7 at the sides, 1 at the back)
                lo, hi_ = RING_Z[1] + (RING_FOLD[0] - RING_Z[1]) * collar, RING_Z[2] + (RING_FOLD[1] - RING_Z[2]) * collar
                top = lo + (hi_ - lo) * k
                rt = tuple(r + (f - r) * collar for r, f in zip(RING_R[1], RING_FOLD[2]))
                for z, (rx, ry) in ((RING_Z[0], RING_R[0]), (top, rt)):
                    for t in (0, RING_T):
                        pts.append((sx * (rx + t) * math.sin(a), RING_Y - (ry + t) * math.cos(a), z))
            mid = (a0 + a1) / 2
            rad = np.array((sx * math.sin(mid), -math.cos(mid), 0))          # (this segment's outward direction)
            fn = lambda c, n, rad=rad, lining=lining: COAT3 if n[2] > 0.7 else (lining if np.dot(n, rad) < -0.2 else COAT2 if n[2] < -0.7 else COAT)
            o = len(col.v)
            col.hull(pts, fn)
            col.v[o:] = [tuple(M @ Vector(v)) for v in col.v[o:]]
        out[nm] = col
    return out


SHOE = 1.5                                      # his shoes' size (big, so their soles read when his feet are up)
RING_SEGS = 7                                    # segments in each half of the collar ring
RING_Z = (38.5, 44, 58)                          # the collar ring: its bottom, its top at the throat, its top at the back
RING_FOLD = (41, 45, (16, 13.5))                 # collar = 1 (his arms up at his face): it slumps down tight round his neck -
                                                 # its top at the throat, at the back, and its top radius
RING_R = ((15.5, 12.5), (23, 18.5))            # its inner radius (x, y) at the bottom and at the top (it flares out)
RING_T = 2.4                                     # its thickness
RING_Y = 1.0                                     # its centre (y) - round his neck


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


def leg(s, hip, knee, ankle, toe, up):
    """One long leg in noir trousers ending in a polished shoe (red for $@L, s = -1; grey for HANZ, s = +1): thigh
    hip -> knee, shin knee -> ankle with a narrow cuff, then the shoe - toe = the way the foot points, up = the top
    of the foot (the sole faces away from it). Returns a Mesh in world space."""
    m = Mesh()
    m.limb(hip, knee, 6.0, 5.2, TROUSER, sides=7, twist=0.3)
    m.hull([tuple(np.array(knee) + 5.3 * np.array((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))))
            for a in np.linspace(0, 2 * math.pi, 8)[:-1] for e in (-0.8, 0, 0.8)], TROUSER)        # the knee, rounded
    m.limb(knee, ankle, 5.2, 4.2, TROUSER, sides=7, twist=0.2)
    t = np.array(toe, float); t /= np.linalg.norm(t)
    u = np.array(up, float); u -= np.dot(u, t) * t; u /= np.linalg.norm(u)
    w = np.cross(t, u)
    a = np.array(ankle, float)
    shoe = SHOE_SAL if s < 0 else SHOE_HANZ
    pt = lambda f, sd, h: tuple(a + (t * f + w * sd + u * h) * SHOE)
    # the shoe: heel block under the ankle, the upper over the foot, a rounded toe; then the sole + heel
    m.hull([pt(f, sd, h) for f in (-3.5, 3) for sd in (-3.2, 3.2) for h in (-2.5, 2.5)], shoe)
    m.hull([pt(f, sd * k, h) for f, k in ((2, 1), (10, 0.95), (13, 0.6)) for sd in (-3.4, 3.4) for h in (-2.6, 1.2 if f > 9 else 2)], shoe)
    m.hull([pt(f, sd * k, -3.3) for f, k in ((-4, 1), (13.4, 0.62)) for sd in (-3.5, 3.5)] +
           [pt(f, sd * k, -2.5) for f, k in ((-4, 1), (13.4, 0.62)) for sd in (-3.5, 3.5)], SOLE)
    m.hull([pt(f, sd, h) for f in (-4, 0.5) for sd in (-3.3, 3.3) for h in (-5.6, -3.2)], BELT)        # the heel (dark)
    return m


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
# what each colour is made of: it decides how the PS1-style lighting treats it
KINDS = {
    'skin': (SAL_SKIN, SAL_SKIN_D, HANZ_SKIN, HANZ_SKIN_D),
    'cloth': (COAT, COAT2, COAT3, TROUSER),
    'leather': (BELT, BUTTON),
    'shoe': (SHOE_SAL, SHOE_HANZ, SOLE),
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
    'void': (VOID,),
    'voideye': (VOID_EYE,),
}
# per material: shine (a fake hard highlight, like a PS1 game's cheap env-map look), glow (it lights itself: 0 = lit
# by the lamps, 1+ = glows at that brightness), see-through (1 = solid, 0.5 = the PS1's half-transparent blend)
LOOK = {'shoe': (0.55, 0, 1), 'hair': (0.18, 0, 1), 'horn': (0.4, 0, 1), 'metal': (0.6, 0, 1), 'chrome': (0.7, 0, 1), 'wet': (0.7, 0, 1),
        'ceramic': (0.25, 0, 1), 'paint': (0.2, 0, 1), 'leather': (0.25, 0, 1), 'wood': (0.12, 0, 1),
        'cavity': (0, 1.0, 1), 'lavawax': (0, 1.25, 1), 'lavaglass': (0.4, 0.55, 0.5), 'glass': (0.6, 0.35, 0.5),
        'voideye': (0, 1.3, 1)}
# which parts get smooth (Gouraud) shading and which keep crisp folds; the angle (degrees) above which an edge stays sharp
SMOOTH = {'hand': 70, 'neck': 70, 'horn': 70, 'heart': 70, 'drop': 80, 'lava': 80, 'candle': 80, 'hourglass': 80, 'sand': 80, 'clouds': 80}
SHARP_ANGLE = 32
# the lights, baked into every vertex (PS1 style - no real shadows): (direction the light shines, colour, strength),
# the ambient light, and the distance fog (start, end, its colour, how thick it gets)
LIGHTS = [((0.48, 0.58, -0.66), (1.0, 0.82, 0.62), 0.95),        # warm key from high on the left, in front
          ((-0.55, -0.45, -0.7), (0.62, 0.66, 1.0), 0.55),        # cool dusk rim from behind, on the right
          ((0.0, 0.9, 0.42), (0.85, 0.72, 0.95), 0.22)]           # lilac fill from below / the camera
AMBIENT = (0.30, 0.25, 0.33)
FOG = (420.0, 1500.0, (0.86, 0.66, 0.66), 0.7)
RES = (320, 180)                                                  # the PS1 render size (shown at 2x in the game)


def kind_of(rgb):
    """Which material a colour is (KINDS), 'plain' if none."""
    for k, cols in KINDS.items():
        if rgb in cols: return k
    return 'plain'


def emit(name, colour_from, tex=None, alpha=1.0):
    """A PS1 material: no real lighting at all - it shows the colour baked into the mesh ('Lit', or colour_from), times
    the face texture (tex, nearest-pixel sampled, so its pixels stay chunky) if given; alpha < 1 = half see-through."""
    mt = bpy.data.materials.new(name); mt.use_nodes = True
    nt = mt.node_tree; nt.nodes.clear(); L = nt.links
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = colour_from; col = ca.outputs['Color']
    if tex is not None:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex; t.interpolation = 'Closest'
        uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UV'; L.new(uv.outputs['UV'], t.inputs['Vector'])
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
        L.new(t.outputs['Color'], mx.inputs[6]); L.new(col, mx.inputs[7]); col = mx.outputs[2]
    em = nt.nodes.new('ShaderNodeEmission'); L.new(col, em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if alpha < 1:
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader'); mix.inputs['Fac'].default_value = alpha
        L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs['Surface'])
    else: L.new(em.outputs[0], out.inputs['Surface'])
    return mt


def materials(face_img=None):
    """The PS1 materials: 'vc' (the baked vertex lighting), 'glass' (the same, half see-through), and 'face' (Mason's
    drawing, nearest-pixel, times the lighting) if face_img."""
    mats = {'vc': emit('m_vc', 'Lit'), 'glass': emit('m_glass', 'Lit', alpha=0.5)}
    if face_img: mats['face'] = emit('m_face', 'Lit', tex=face_img)
    return mats


def face_image(src=None):
    """Mason's face drawing over the split skin, as the 64x64 texture it is (PS1 games ran on textures this small):
    $@L's red left of FACE_SPLIT, HANZ's grey right of it, his black lines on top. src = the drawing (RGBA array),
    FACE if None."""
    if src is None: src = np.array(Image.open(FACE).convert('RGBA'))
    H, W = src.shape[:2]
    img = np.zeros((H, W, 4), np.uint8); img[..., 3] = 255
    img[:, :FACE_SPLIT, :3] = [SAL_SKIN >> 16 & 255, SAL_SKIN >> 8 & 255, SAL_SKIN & 255]
    img[:, FACE_SPLIT:, :3] = [HANZ_SKIN >> 16 & 255, HANZ_SKIN >> 8 & 255, HANZ_SKIN & 255]
    img[src[..., 3] > 0, :3] = (16, 14, 18)
    path = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_face_tex_%d.png' % id(src)); Image.fromarray(img).save(path)
    im = bpy.data.images.load(path); im.colorspace_settings.name = 'sRGB'
    return im


def to_object(name, m, mats, face_box=None):
    """Turns a Mesh into a Blender object: its own colour per polygon ('Col'), the face texture's UVs on the head (a
    straight projection from the front over face_box = (x0, x1, z0, z1)), smooth shading with crisp creases
    (SMOOTH / SHARP_ANGLE), and its material (see-through kinds -> 'glass'). Call light_up() once it's placed."""
    me = bpy.data.meshes.new(name); me.from_pydata(m.v, [], m.f); me.update()
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.new('Lit', 'FLOAT_COLOR', 'CORNER')
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
        k = kind_of(rgb); textured = bool(face_box and m.uv.get(poly.index) and 'face' in mats)
        poly.material_index = order.index('face' if textured else 'glass' if LOOK.get(k, (0, 0, 1))[2] < 1 else 'vc')
        if textured:
            for li in poly.loop_indices: attr.data[li].color = (1, 1, 1, 1)      # (the texture carries the face's colours)
    ang = next((a for key, a in SMOOTH.items() if key in name), SHARP_ANGLE)
    me.set_sharp_from_angle(angle=math.radians(ang))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    ob['kinds'] = [kind_of(rgb) for rgb in m.c]
    return ob


def light_up(ob, cam=None, snap=True):
    """Bakes the room's light into the object's vertices, the way a PS1 game lit things: each corner's colour = its own
    colour x (ambient + every light hitting its normal), plus a hard fake highlight on shiny kinds (LOOK), glowing kinds
    their own colour, then fogged toward the dusk with distance from the camera. snap = also snap every vertex to the
    pixel grid of the low-res screen (RES) - the PS1's wobbly vertices."""
    me = ob.data; mw = ob.matrix_world; rot = mw.to_3x3()
    col = me.color_attributes['Col'].data; lit = me.color_attributes['Lit'].data
    kinds = ob.get('kinds') or ['plain'] * len(me.polygons)
    cpos = cam.matrix_world.translation if cam else Vector((0, -215, 78))
    Ls = [(Vector(d).normalized(), Vector(c), e) for d, c, e in LIGHTS]
    fs, fe, fc, fm = FOG
    try: normals = [n.vector for n in me.corner_normals]
    except AttributeError: normals = [me.loops[i].normal for i in range(len(me.loops))]
    for poly in me.polygons:
        k = kinds[poly.index] if poly.index < len(kinds) else 'plain'
        shine, glow, _ = LOOK.get(k, (0, 0, 1))
        for li in poly.loop_indices:
            p = mw @ me.vertices[me.loops[li].vertex_index].co
            n = (rot @ normals[li]).normalized()
            base = Vector(col[li].color[:3])
            if glow: c = base * glow
            else:
                light = Vector(AMBIENT)
                v = (cpos - p).normalized()
                hl = 0.0
                for d, lc, e in Ls:
                    ndl = max(0.0, n.dot(-d)); light += lc * (ndl * e)
                    if shine: hl += max(0.0, n.dot((v - d).normalized())) ** 14 * e
                c = Vector((base.x * light.x, base.y * light.y, base.z * light.z)) + Vector((1, 0.95, 0.9)) * (hl * shine)
            f = min(1.0, max(0.0, ((cpos - p).length - fs) / (fe - fs))) * fm
            c = c * (1 - f) + Vector(fc) * f
            lit[li].color = (min(c.x, 4), min(c.y, 4), min(c.z, 4), 1.0)
    if snap and cam: snap_to_screen(ob, cam)


def snap_to_screen(ob, cam):
    """The PS1's wobble: every vertex is moved to the nearest pixel of the low-res screen (RES) at its own depth, so
    edges step and shimmer as he moves."""
    sc = bpy.context.scene; me = ob.data
    inv_c = cam.matrix_world.inverted(); cw = cam.matrix_world
    mw = ob.matrix_world; inv_o = mw.inverted()
    fx = cam.data.lens / cam.data.sensor_width                                   # (screen width = 1 at depth 1 / fx)
    w, h = RES
    sx = 1 / (w * fx); sy = sx                                                   # (one pixel, in view space per unit depth)
    for v in me.vertices:
        pc = inv_c @ (mw @ v.co)
        z = -pc.z
        if z <= 0.1: continue
        x = round(pc.x / z / sx) * sx * z; y = round(pc.y / z / sy) * sy * z
        v.co = inv_o @ (cw @ Vector((x, y, pc.z)))
    me.update()


def lights():
    """No lamps to place: the light is baked into the vertices (light_up, LIGHTS / AMBIENT / FOG)."""
    sc = bpy.context.scene
    w = bpy.data.worlds.new('dusk'); sc.world = w


def render_settings(samples=1):
    """Renders like a PS1: tiny (RES), no smoothing of edges (one sample, a box filter), no denoising, colours as baked;
    transparent film so the game lays it over the room."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = False; sc.cycles.use_denoising = False
    sc.cycles.pixel_filter_type = 'BOX'; sc.cycles.filter_width = 0.01
    sc.cycles.max_bounces = 0; sc.cycles.transparent_max_bounces = 8
    sc.render.film_transparent = True; sc.render.use_freestyle = False
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.resolution_x, sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'


def ps1_post(img):
    """The PS1's colour: 15-bit (32 levels a channel) with its 4x4 ordered dither, and hard edges (see-through is all,
    half, or nothing). img = RGBA array; returns a new one."""
    B = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], float) / 16 - 0.5
    hh, ww = img.shape[:2]
    d = np.tile(B, (hh // 4 + 1, ww // 4 + 1))[:hh, :ww, None] * 8
    rgb = np.clip(np.floor((img[..., :3].astype(float) + d) / 8) * 8 + 4, 0, 255)
    a = img[..., 3].astype(int)
    a = np.where(a < 60, 0, np.where(a < 190, 128, 255))
    out = np.zeros_like(img); out[..., :3] = rgb; out[..., 3] = a; out[a == 0] = 0
    return out


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
    for ob in list(sc.objects):
        if ob.type == 'MESH': light_up(ob, None, snap=False)
    sc['mats'] = 1; build.mats = mats
    return cam, head_M


# pairs of pieces that must never pass through each other (the shoulder joins and the hair on the head are meant to
# overlap, so they're not listed)
NO_CLIP = [('leg_sal', 'counter'), ('leg_hanz', 'counter'), ('leg_sal', 'leg_hanz'), ('skull', 'collar_l'), ('skull', 'collar_r'), ('skull', 'torso'), ('horn', 'collar_r'), ('horn', 'collar_l'), ('horn', 'face'), ('hair', 'collar_l'), ('hair', 'collar_r'), ('face', 'collar_l'), ('face', 'collar_r'), ('hair', 'torso'),
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
