"""THE POLYGON ROOM: what $@L / HANZ's room becomes when he CLAPS (LostScene's `clap` animation) - everything but him
rebuilt as a low-poly world of flat-shaded facets in candy colours: a faceted dusk sky, a striped vapour sun, a
checkerboard plain of polygons running to the horizon with far facet mountains, pyramids (one with an eye), broken
columns, a floating upside-down island, stairs of cubes climbing to a door in the sky, a giant stone head sinking into
the floor - and moving things: a moon wearing a ring of orbiting cubes, a polygon whale swimming through the sky, a
spinning torus, and on his desk a floating gem with an eye that turns to watch. His counter and desk things are rebuilt
in the same facets (from hanz_3d.py's own meshes, through the room's own camera, so THE DESK still lines up), plus new
things on it: a little pyramid with a glowing door and a tower of cubes balanced on their corners.

No Blender render: it projects the meshes itself (the LOST camera, hanz_anim.CAM) and paints the facets back to front
with PIL at 2x, then shrinks them (clean edges, no PS1 crunch - he stays the only PS1 thing in it).

Run:  python3 tools/sprites/hanz_poly.py [--preview FILE]
Writes public/assets/shop/lost/poly_room.png (the world behind him), poly_desk.png (his counter + desk things),
poly_things.png (each moving thing: a row of frames) and src/scenes/lostPoly.js (where they go).
"""
import os, sys, math, json, argparse
import numpy as np
from PIL import Image, ImageDraw
from scipy.spatial import ConvexHull

sys.path.insert(0, os.path.dirname(__file__))
import hanz_3d as H

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public/assets/shop/lost')
TABLE = os.path.join(ROOT, 'src/scenes/lostPoly.js')
W, Hh = 640, 360
SS = 2                                            # painted this many times bigger, then shrunk (clean edges)
CAM = ((0, -215, 78), (0, 0, 36), 36)             # the LOST room's camera (hanz_anim.CAM) - the desk must line up
BG_CAM = ((0, -420, 70), (0, 0, 96), 30)          # the world behind him: a wider lens, looking out over the plain
LIGHT = np.array((-0.45, -0.55, 0.7)); LIGHT = LIGHT / np.linalg.norm(LIGHT)   # where the light comes from (up, left, front)
AMB = 0.52                                        # how bright a facet is with no light on it
JIT = 0.06                                        # each facet's own small brightness wobble (so the facets read)
COLOURS = 96                                      # palette size of the written PNGs (flat colours + their soft edges)

# his counter and desk things, recoloured: the old colours (hanz_3d) -> the polygon world's candy ones
RECOLOUR = {H.WOOD2: 0x7adcff, H.WOOD: 0x3a9ee8, H.WOOD3: 0x2c3696, H.GREEN: 0xff9a3a, H.CLOCK: 0xfff3dc, H.BRASS: 0xffd447,
            H.BRASS2: 0xe8a62a, H.INKC: 0x2a1240, H.CHROME: 0xc9d3ff, H.LAVA_GLASS: 0x6a3ae0, H.WAX: 0xfff7ea,
            H.GLASS: 0xa8f2ff, H.SAND: 0xffd06a}
rng = np.random.default_rng(13)


def hexrgb(c): return np.array(((c >> 16) & 255, (c >> 8) & 255, c & 255), float)


class Cam:
    """A pinhole camera like Blender's (sensor 36 mm wide, fit to the width): world point -> screen pixel + depth."""
    def __init__(self, spec, scale=SS):
        loc, tgt, lens = spec
        self.l = np.array(loc, float); f = np.array(tgt, float) - self.l; self.f = f / np.linalg.norm(f)
        r = np.cross(self.f, (0, 0, 1)); self.r = r / np.linalg.norm(r); self.u = np.cross(self.r, self.f)
        self.k = lens / 36 * W * scale; self.s = scale

    def __call__(self, P):
        d = np.asarray(P, float) - self.l
        x, y, z = d @ self.r, d @ self.u, d @ self.f
        return np.stack([W * self.s / 2 + x / z * self.k, Hh * self.s / 2 - y / z * self.k], -1), z


class Scene:
    """Faces to paint: each a polygon (world points), its colour, how see-through, whether it lights itself."""
    def __init__(self): self.faces = []

    def add(self, pts, col, alpha=1.0, glow=False, jit=True, bias=0.0):
        self.faces.append((np.asarray(pts, float), col, alpha, glow, jit, bias))

    def hull(self, pts, col, **kw):
        """The convex hull of pts as facets (col = a colour or colfn(centre, normal))."""
        P = np.asarray(pts, float); h = ConvexHull(P)
        for tri, eq in zip(h.simplices, h.equations):
            a, b, c = P[tri]
            if np.dot(np.cross(b - a, c - a), eq[:3]) < 0: tri = tri[[0, 2, 1]]
            cen = P[tri].mean(0)
            self.add(P[tri], col(cen, eq[:3]) if callable(col) else col, **kw)

    def mesh(self, m, recolour=None, alpha_of=None):
        """A hanz_3d.Mesh, face by face (recolour maps its colours)."""
        V = np.array(m.v, float)
        for f, c in zip(m.f, m.c):
            c2 = (recolour or {}).get(c, c)
            self.add(V[f], c2, alpha=(alpha_of or {}).get(c, 1.0))

    def paint(self, cam, size=(W, Hh), img=None):
        """Paints every facet back to front, flat shaded (light + its own wobble), culling ones facing away."""
        w, h = size[0] * SS, size[1] * SS
        img = img or Image.new('RGBA', (w, h), (0, 0, 0, 0))
        dr = ImageDraw.Draw(img, 'RGBA')
        order = []
        for i, (P, col, a, glow, jit, bias) in enumerate(self.faces):
            sp, z = cam(P)
            if (z <= 1).any(): continue
            n = np.cross(P[1] - P[0], P[2] - P[0]); nl = np.linalg.norm(n)
            if nl < 1e-9: continue
            n /= nl
            if np.dot(n, cam.l - P.mean(0)) < 0 and a >= 1: continue                    # (facing away)
            lum = 1.0 if glow else AMB + (1 - AMB) * max(0.0, float(np.dot(n, LIGHT))) * 1.15
            if jit: lum *= 1 + (rng.random() - 0.5) * 2 * JIT
            c = np.clip(hexrgb(col) * lum, 0, 255)
            order.append((z.mean() + bias, sp, c, a))
        for z, sp, c, a in sorted(order, key=lambda o: -o[0]):
            dr.polygon([tuple(p) for p in sp], fill=(int(c[0]), int(c[1]), int(c[2]), int(255 * a)))
        return img


def shrink(img, size=None):
    """2x -> 1x (a box filter: clean anti-aliased edges)."""
    return img.resize(size or (img.width // SS, img.height // SS), Image.LANCZOS)


def save(img, name):
    """A palette PNG (flat colours + soft edges compress tiny)."""
    path = os.path.join(OUT, name)
    img.quantize(COLOURS, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)
    print('wrote', name, img.size, os.path.getsize(path) // 1024, 'KB')


# ------------------------------------------------------------------ shapes
def ico(c, r, sub=0, squash=(1, 1, 1)):
    """A faceted ball: an icosahedron (sub = 1 splits each face in four), centred on c, radius r."""
    t = (1 + 5 ** 0.5) / 2
    V = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    V = [np.array(v) / np.linalg.norm(v) for v in V]
    F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
         (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    for _ in range(sub):
        mid = {}
        def m(a, b):
            k = tuple(sorted((a, b)))
            if k not in mid: v = V[a] + V[b]; V.append(v / np.linalg.norm(v)); mid[k] = len(V) - 1
            return mid[k]
        F = [f for a, b, cc in F for f in ((a, m(a, b), m(a, cc)), (b, m(b, cc), m(a, b)), (cc, m(a, cc), m(b, cc)), (m(a, b), m(b, cc), m(a, cc)))]
    V = np.array(V) * r * np.array(squash) + np.array(c)
    return V, F


def rot(P, c, rz=0.0, rx=0.0):
    """Turns points round c: rz (about the up axis), then rx (tipping toward you), radians."""
    P = np.asarray(P, float) - c
    cz, sz, cx, sx = math.cos(rz), math.sin(rz), math.cos(rx), math.sin(rx)
    P = P @ np.array([[cz, sz, 0], [-sz, cz, 0], [0, 0, 1]])
    P = P @ np.array([[1, 0, 0], [0, cx, sx], [0, -sx, cx]])
    return P + c


def cube(c, s, rz=0.0, rx=0.0):
    x, y, z = c
    P = np.array([(x + i * s / 2, y + j * s / 2, z + k * s / 2) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)])
    return rot(P, np.array(c, float), rz, rx)


def prism(c, r, h, sides=6, z0=0.0, top_r=None):
    x, y, _ = c
    return [(x + rr * math.cos(a), y + rr * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, sides + 1)[:-1]
            for rr, z in ((r, z0), (top_r if top_r is not None else r, z0 + h))]


# ------------------------------------------------------------------ the world behind him
SKY = [(0x24164f, 0.0), (0x4a2a8a, 0.3), (0xb04ab0, 0.62), (0xff7aa8, 0.85), (0xffb98a, 1.0)]   # top -> horizon
HORIZON = 214                                      # where the plain meets the sky (640x360)


def sky_colour(k):
    for (c0, k0), (c1, k1) in zip(SKY, SKY[1:]):
        if k <= k1: q = (k - k0) / (k1 - k0); return hexrgb(c0) * (1 - q) + hexrgb(c1) * q
    return hexrgb(SKY[-1][0])


def background():
    """The world behind him: faceted sky, the vapour sun, far mountains, the polygon checkerboard plain and its things."""
    w, h = W * SS, Hh * SS
    img = Image.new('RGBA', (w, h), (0, 0, 0, 255)); dr = ImageDraw.Draw(img)
    # the sky: a jittered triangle grid, each facet the gradient's colour at its middle (+ a wobble)
    nx, ny = 14, 6
    pts = {}
    for j in range(ny + 1):
        for i in range(nx + 1):
            jx = 0 if i in (0, nx) else rng.uniform(-0.35, 0.35); jy = 0 if j in (0, ny) else rng.uniform(-0.3, 0.3)
            pts[i, j] = ((i + jx) / nx * w, (j + jy) / ny * (HORIZON + 6) * SS)
    for j in range(ny):
        for i in range(nx):
            for tri in (((i, j), (i + 1, j), (i, j + 1)), ((i + 1, j), (i + 1, j + 1), (i, j + 1))):
                P = [pts[t] for t in tri]; k = np.mean([p[1] for p in P]) / (HORIZON * SS)
                c = np.clip(sky_colour(k) * (1 + (rng.random() - 0.5) * 0.08), 0, 255)
                dr.polygon(P, fill=tuple(int(v) for v in c) + (255,))
    for _ in range(46):                                                             # star diamonds
        x, y, s = rng.uniform(0, w), rng.uniform(0, HORIZON * SS * 0.5), rng.uniform(1.5, 3.5) * SS
        dr.polygon([(x, y - s), (x + s * 0.5, y), (x, y + s), (x - s * 0.5, y)], fill=(255, 240, 250, 200))
    # the vapour sun: a 16-gon, yellow to pink, cut by bands of sky toward the horizon
    sx, sy, sr = 470 * SS, 168 * SS, 64 * SS
    for k in range(12, 0, -1):
        r = sr * k / 12; c = hexrgb(0xffe86a) * (k / 12) + hexrgb(0xff5aa8) * (1 - k / 12)
        dr.polygon([(sx + r * math.cos(a), sy + r * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 17)[:-1]], fill=tuple(int(v) for v in c) + (255,))
    for b in range(6):
        y = sy + (8 + b * 10) * SS; th = (2 + b * 1.1) * SS
        dr.rectangle((sx - sr - 2, y, sx + sr + 2, y + th), fill=tuple(int(v) for v in sky_colour(y / (HORIZON * SS))) + (255,))
    # the 3D part: mountains on the horizon, the plain, pyramids, columns, the floating island, the stairs, the head
    cam = Cam(BG_CAM); S = Scene()
    for i in range(26):                                                             # far facet mountains
        x = -2600 + i * 210 + rng.uniform(-60, 60); hgt = rng.uniform(140, 420)
        S.hull([(x - 200, 4200, 0), (x + 200, 4200, 0), (x + rng.uniform(-60, 60), 4300, hgt), (x, 4100, 0), (x + 40, 4400, 0)],
               lambda c, n: [0x5a3aa0, 0x7a4ab8, 0x3a2a78][int(c[0] * 7 + 9999) % 3], bias=200)
    tile = 120                                                                      # the checkerboard plain, with a gentle roll far off
    for gy in range(-2, 34):
        for gx in range(-16, 16):
            hz = lambda X, Y: 0 if Y < 1400 else 30 * math.sin(X * 0.004 + Y * 0.002) * min(1, (Y - 1400) / 1000)
            x0, y0 = gx * tile, gy * tile; x1, y1 = x0 + tile, y0 + tile
            q = [(x0, y0, hz(x0, y0)), (x1, y0, hz(x1, y0)), (x1, y1, hz(x1, y1)), (x0, y1, hz(x0, y1))]
            col = 0xff6fb0 if (gx + gy) % 2 else 0x3a1f6e
            S.add([q[0], q[1], q[2]], col); S.add([q[0], q[2], q[3]], col if (gx * 7 + gy) % 5 else (0xff8ac2 if col == 0xff6fb0 else 0x4a2a84))
    pal = lambda a, b: (lambda c, n: a if n[0] < 0 else b)
    S.hull([(-700, 1500, 0), (-380, 1500, 0), (-700, 1820, 0), (-380, 1820, 0), (-540, 1660, 330)], pal(0xffc23a, 0xd88a1a))   # the eye pyramid
    S.hull([(-980, 2300, 0), (-760, 2300, 0), (-980, 2520, 0), (-760, 2520, 0), (-870, 2410, 230)], pal(0x2ed8c8, 0x1a8a96))
    S.hull([(700, 2000, 0), (980, 2000, 0), (700, 2280, 0), (980, 2280, 0), (840, 2140, 300)], pal(0x2ed8c8, 0x1a8a96))
    eye_c = np.array((-540, 1499, 150))                                             # its eye: white, iris, pupil (on the front face)
    for r, c in ((46, 0xfff6e0), (24, 0x2ad4c8), (11, 0x140a24)):
        S.add([eye_c + (r * math.cos(a), -1 - r / 40, r * 0.6 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 9)[:-1]], c, glow=True, jit=False, bias=-5 - r / 10)
    for k, (x, y, hh) in enumerate([(-420, 380, 120), (-470, 620, 170), (-520, 880, 90), (-570, 1160, 150), (-620, 1460, 60)]):   # broken columns
        S.hull(prism((x, y, 0), 26, hh, 8), lambda c, n: 0xf6e8ff if n[0] < 0.2 else 0xb8a0e0)
        S.hull(prism((x, y, hh), 34, 12, 8), 0xffffff)
    isl = np.array((470, 900, 330))                                                 # the floating upside-down island
    S.hull([isl + (r * math.cos(a), r * 0.7 * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 9)[:-1] for r, z in ((150, 0), (110, -70))] + [isl + (20, 0, -230)],
           lambda c, n: (0xd0703e if n[0] < 0 else 0xa85030) if n[2] < 0.3 else 0x5ee08a)
    S.hull(prism(isl + (40, 0, 0), 36, 120, 6, 0, 0), 0x2fbf7a); S.hull(prism(isl + (-60, 20, 0), 26, 80, 6, 0, 0), 0x24a868)
    for k in range(9):                                                              # stairs of cubes climbing to a door in the sky
        c = (180 + k * 70, 600 + k * 40, 30 + k * 52)
        S.hull(cube(c, 46), lambda cc, n: 0xfff0f8 if n[2] > 0.5 else 0xd8b8f0 if n[0] < 0 else 0xa888d0)
    dc = np.array((180 + 9 * 70, 600 + 9 * 40, 30 + 9 * 52 + 40))
    S.hull([dc + (x, y, z) for x in (-38, 38) for y in (-6, 6) for z in (-60, 60)], 0xffffff)
    S.add([dc + (-28, -7, -60), dc + (28, -7, -60), dc + (28, -7, 50), dc + (-28, -7, 50)], 0xffe68a, glow=True, jit=False, bias=-3)
    head = np.array((-330, 420, -30))                                               # the giant stone head, sinking into the floor
    Vh, Fh = ico(head, 140, 1, (0.78, 0.8, 1.05))
    for f in Fh:
        P = Vh[list(f)]
        if P[:, 2].max() < 0: continue
        S.add(P, 0xc8b8d8 if P.mean(0)[0] > head[0] else 0xa894c0)
    S.hull([head + (x, -112, z) for x, z in ((-12, 60), (12, 60), (0, 10))] + [head + (0, -142, 10)], 0xd8c8e8)          # his nose
    for ex in (-48, 48):
        S.add([head + (ex + 18 * math.cos(a), -118, 92 + 10 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 7)[:-1]], 0x2a1846, jit=False, bias=-8)
    S.add([head + (-40, -125, 20), head + (40, -125, 20), head + (0, -128, 8)], 0x2a1846, jit=False, bias=-8)
    S.paint(cam, img=img)
    return shrink(img)


# ------------------------------------------------------------------ the desk
def desk():
    """His counter and every desk thing (hanz_3d's own meshes, recoloured into facets), through the LOST camera, plus the
    new things on it: a little pyramid with a glowing door, a tower of cubes balanced on their corners. Covers a pixel
    more than the 3D desk (so no gap shows round him). Returns RGBA."""
    cam = Cam(CAM); S = Scene()
    for nm, m in H.counter().items(): S.mesh(m, RECOLOUR)
    for nm, m in H.props().items(): S.mesh(m, RECOLOUR, {H.GLASS: 0.55, H.LAVA_GLASS: 0.85})
    pal = lambda a, b: (lambda c, n: a if n[0] < 0 else b)
    S.hull([(-30, -18, 0.5), (-16, -18, 0.5), (-30, -6, 0.5), (-16, -6, 0.5), (-23, -12, 13)], pal(0xffd447, 0xe09a20))   # the pyramid...
    S.add([(-25, -15.2, 0.6), (-21, -15.2, 0.6), (-21.6, -14.6, 5.6), (-24.4, -14.6, 5.6)], 0xfff2a0, glow=True, jit=False, bias=-2)   # ...its door
    S.hull(cube((42, -12, 3.8), 6.5, 0.3), lambda c, n: 0x2fd6c6 if n[2] > 0.5 else 0x1a9a98)                          # the balanced cubes
    S.hull(cube((42.6, -12, 11.6), 5.5, 0.785, 0.615), lambda c, n: 0xff7ab8 if n[2] > 0.3 else 0xc0408a)
    Vb, Fb = ico((43.2, -12, 18.2), 2.6)
    for f in Fb: S.add(Vb[list(f)], 0xffd447)
    img = shrink(S.paint(cam))
    a = np.array(img)
    from scipy import ndimage
    cover = ndimage.binary_dilation(a[..., 3] > 100, iterations=1)                 # (a pixel more round the outside)
    grown = ndimage.grey_dilation(a, size=(3, 3, 1))
    a = np.where((cover & (a[..., 3] < 200))[..., None], np.concatenate([grown[..., :3], np.full(a.shape[:2] + (1,), 255)], -1), a)
    return Image.fromarray(a.astype(np.uint8))


# ------------------------------------------------------------------ the moving things (a row of frames each)
def thing(build, w, h, n, spec, bias_cam=None):
    """Renders `n` frames of a moving thing into w x h (build(f, S) adds its faces for frame f; spec = its camera)."""
    cam = Cam(spec)
    cam.k = cam.k * 1.0
    frames = []
    for f in range(n):
        S = Scene(); build(f, S)
        img = S.paint(cam, (W, Hh))
        frames.append(shrink(img))
    # crop all frames to the same box round everything any of them drew
    al = np.max([np.array(fr)[..., 3] for fr in frames], 0)
    ys, xs = np.nonzero(al > 0)
    x0, x1, y0, y1 = max(0, xs.min() - 2), min(W, xs.max() + 3), max(0, ys.min() - 2), min(Hh, ys.max() + 3)
    return [fr.crop((x0, y0, x1, y1)) for fr in frames], (x0, y0)


THING_CAM = ((0, -600, 0), (0, 0, 0), 50)         # a camera straight on (things rendered alone, then placed by the game)


def b_moon(f, S, n=12):
    """A faceted moon, turning, with a ring of little cubes orbiting it."""
    V, F = ico((0, 0, 0), 60, 1)
    V = rot(V, np.zeros(3), f / n * 2 * math.pi / 5, 0.3)
    for k, fc in enumerate(F): S.add(V[list(fc)], [0xf4ecff, 0xd8c8f0, 0xbfaee0][k % 3])
    for k in range(8):
        a = f / n * 2 * math.pi / 8 * 2 + k / 8 * 2 * math.pi
        c = (math.cos(a) * 100, math.sin(a) * 100 * 0.35 * -1, math.sin(a) * 26)
        P = cube(c, 12, a, 0.5)
        S.hull(P, [0xffd447, 0x2fd6c6, 0xff7ab8][k % 3], bias=-200 if math.sin(a) < 0 else 200)


def b_whale(f, S, n=6):
    """A polygon whale: a long faceted body, a fin, a flapping tail (n frames a flap)."""
    flap = math.sin(f / n * 2 * math.pi)
    body = [(x, y * r, z * r * 0.8) for x, r in ((-80, 8), (-50, 28), (0, 34), (50, 24), (90, 10)) for y, z in ((1, 0), (0, 1), (-1, 0), (0, -1), (0.7, 0.7), (-0.7, 0.7), (0.7, -0.7), (-0.7, -0.7))]
    S.hull(body, lambda c, n_: 0x3a5ad8 if n_[2] > -0.2 else 0xbfe0ff)
    S.hull([(90, 0, 0), (120, 0, 26 * flap + 4), (122, 0, 26 * flap + 34), (128, 6, 26 * flap - 26), (100, -4, 0)], 0x2a44b0)
    S.hull([(0, -10, -20), (20, -10, -18), (-6, -34, -40), (6, -12, -24)], 0x2a44b0)
    S.add([(-52, -26, 8), (-46, -26, 8), (-46, -27, 2), (-52, -27, 2)], 0x0a0a20, jit=False, bias=-50)
    for k in range(4): S.add([(-30 + k * 12, -30, -12), (-26 + k * 12, -30, -12), (-28 + k * 12, -31, -24)], 0x8ab0f0, jit=False, bias=-40)


def b_torus(f, S, n=12):
    """A spinning torus, faceted."""
    R, r, nu, nv = 50, 18, 14, 6
    ph = f / n * 2 * math.pi / nu * 2
    pt = lambda i, j: np.array(((R + r * math.cos(j / nv * 2 * math.pi)) * math.cos(i / nu * 2 * math.pi + ph),
                                (R + r * math.cos(j / nv * 2 * math.pi)) * math.sin(i / nu * 2 * math.pi + ph),
                                r * math.sin(j / nv * 2 * math.pi)))
    for i in range(nu):
        for j in range(nv):
            P = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)]
            P = [rot([p], np.zeros(3), 0, 1.1)[0] for p in P]
            S.add([P[0], P[1], P[2]], 0x2fd6c6 if (i + j) % 2 else 0xffd447); S.add([P[0], P[2], P[3]], 0x2fd6c6 if (i + j) % 2 else 0xffd447)


def b_gem(f, S, n=12):
    """The desk gem: an octahedron of glass with an eye on its front, turning a little to watch."""
    turn = math.sin(f / n * 2 * math.pi) * 0.5
    P = np.array([(0, 0, 40), (0, 0, -40), (26, 0, 0), (-26, 0, 0), (0, 26, 0), (0, -26, 0)], float)
    P = rot(P, np.zeros(3), turn)
    for tri in ((0, 2, 5), (0, 5, 3), (0, 3, 4), (0, 4, 2), (1, 5, 2), (1, 3, 5), (1, 4, 3), (1, 2, 4)):
        S.add(P[list(tri)], [0xff7ab8, 0xd04aa0, 0xff9ad0, 0xa83a90][tri[1] % 4])
    c = rot([(0, -14, 4)], np.zeros(3), turn)[0]
    for r, col in ((8, 0xfff6e0), (4.5, 0x2fd6c6), (2.2, 0x140a24)):
        ring = [c + rot([(r * math.cos(a), 0, r * math.sin(a))], np.zeros(3), turn)[0] for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
        S.add(ring, col, glow=True, jit=False, bias=-30 - r)


def place(cam_spec, p):
    """Where a world point lands on the 640x360 view (camera cam_spec)."""
    sp, _ = Cam(cam_spec, 1)(np.array([p], float))
    return sp[0]


THINGS = {
    # name: (builder, frames, centre on the 640x360 view, scale)
    'moon': (b_moon, 12, (108, 66), 0.62),
    'whale': (b_whale, 6, (300, 44), 0.6),
    'torus': (b_torus, 12, (560, 104), 0.5),
    'gem': (b_gem, 12, None, 0.42),
}


def things():
    """Every moving thing as a row of frames in one sheet; returns (sheet, table)."""
    rows, table, y = [], {}, 0
    for name, (fn, n, at, sc) in THINGS.items():
        frames = []
        R = Scene()
        for f in range(n):
            S = Scene(); fn(f, S, n)
            cam = Cam(THING_CAM); cam.k *= sc
            frames.append(shrink(S.paint(cam, (W, Hh))))
        al = np.max([np.array(fr)[..., 3] for fr in frames], 0)
        ys, xs = np.nonzero(al > 0)
        x0, x1, y0, y1 = xs.min() - 1, xs.max() + 2, ys.min() - 1, ys.max() + 2
        frames = [fr.crop((x0, y0, x1, y1)) for fr in frames]
        fw, fh = frames[0].size
        if at is None: at = tuple(int(v) for v in place(CAM, (-40, 12, 30)))       # the gem hovers over his desk, over the bell
        row = Image.new('RGBA', (fw * n, fh))
        for i, fr in enumerate(frames): row.paste(fr, (i * fw, 0))
        rows.append(row)
        table[name] = {'x': int(at[0] - fw / 2), 'y': int(at[1] - fh / 2), 'w': fw, 'h': fh, 'n': n, 'sy': y}
        y += fh
    sheet = Image.new('RGBA', (max(r.width for r in rows), y))
    yy = 0
    for r in rows: sheet.paste(r, (0, yy)); yy += r.height
    return sheet, table


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--preview', default='')
    a = ap.parse_args()
    bg = background(); save(bg.convert('RGB').convert('RGBA'), 'poly_room.png')
    dk = desk(); save(dk, 'poly_desk.png')
    sheet, table = things(); save(sheet, 'poly_things.png')
    with open(TABLE, 'w') as f:
        f.write('// THE POLYGON ROOM (what his room becomes when he claps) - generated by tools/sprites/hanz_poly.py: do not edit by\n'
                '// hand. things[name]: where it goes (x, y, w, h on the 640x360 view; the whale swims, the gem bobs), its row in\n'
                '// poly_things.png (sy) and how many frames it has (n).\n')
        f.write('export const LOST_POLY = ' + json.dumps({'things': table}) + ';\n')
    print('wrote', os.path.relpath(TABLE, ROOT))
    if a.preview:
        pv = bg.copy()
        for name, t in table.items():
            fr = sheet.crop((0, t['sy'], t['w'], t['sy'] + t['h'])); pv.alpha_composite(fr, (t['x'], t['y']))
        pv.alpha_composite(dk)
        pv.save(a.preview); print('preview', a.preview)


if __name__ == '__main__':
    main()
