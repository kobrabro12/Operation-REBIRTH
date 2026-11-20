"""THE DRAWN ROOM: what HANZ / $@L's room turns into when he snaps his fingers (LostScene `snap`) - the whole place
redrawn by hand in ink and watercolour on cream paper, while he stays a 3D PS1 man in the middle of it.

Run:  python3 tools/sprites/hanz_drawn.py [--preview FILE]       (needs bpy, like hanz_anim.py; ~1 min)

Writes into public/assets/shop/lost/:
  drawn_wash.png        the background's paint (paper, a watercolour dusk, a checkerboard plain to the horizon)
  drawn_ink_<0..2>.png  its ink lines, three times - drawn again with a slightly different hand each time, so the lines
                        "boil" when the game flips between them (the classic hand-drawn wobble)
  drawn_desk.png        his counter and everything on it, traced from a clean render of the real desk (so it covers
                        exactly what the 3D counter covers - his frames are cut out where the desk is in front of him)
  drawn_desk_ink_<0..2>.png  the desk's ink lines (boiling)
  drawn_things.png      the surreal things that pop in after the snap, each a row of frames (3 boil frames; the eye has
                        a 4th, blinking): an EYE in the sky for a moon, a FISH with a little lit house on its back, a
                        STAIRCASE climbing into a cloud to an open DOOR, a TEACUP pouring its tea UP into a cloud, a
                        WINDOW standing alone on the plain with night behind it, and a bare TREE whose twigs end in hands,
                        one holding a pocket watch
and src/scenes/lostDrawn.js (where each thing goes and its frames).

Everything is drawn at 2x (SS) with wobbly, pressure-varying ink strokes (`stroke`), watercolour washes with
granulation and dark pooled edges (`wash`), hatching (`hatch`), then shrunk to 640x360.
"""
import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public/assets/shop/lost')
TABLE = os.path.join(ROOT, 'src/scenes/lostDrawn.js')
W, H = 640, 360                                  # the game's view
SS = 2                                           # everything is drawn this many times bigger, then shrunk (smooth lines)
BOIL = 3                                         # how many times each ink layer is redrawn (the lines boil between them)
INK = (38, 26, 24)                               # the ink: a warm brown-black
PAPER = (241, 232, 212)                          # cream paper
HORIZON = 212                                    # where the plain meets the sky (640x360 coords)
VANISH = (320, HORIZON)                          # where the checkerboard's lines all run to
WOBBLE = 1.6                                     # how far (px, at 640) an ink line wanders off its path
COVER = None                                     # (while drawing a thing: how much paint is where - its alpha)
BOIL_AMP = 0.9                                   # ...and how much of that changes between the boil frames


# ------------------------------------------------------------------ drawing kit
def smooth_noise(shape, scale, seed):
    """A smooth random field (0 mean, ~1 deviation) with blobs about `scale` pixels across."""
    r = np.random.default_rng(seed).standard_normal(shape)
    n = ndimage.gaussian_filter(r, scale)
    return n / (n.std() + 1e-9)


def paper(w, h, seed=1):
    """Cream paper: a little uneven in tone, with a fine tooth."""
    base = np.ones((h, w, 3)) * np.array(PAPER, float)
    base += smooth_noise((h, w), 40, seed)[..., None] * 4
    base += smooth_noise((h, w), 1.2, seed + 1)[..., None] * 2.5
    return base


def wash(img, mask, colour, alpha=0.8, seed=0, edge=0.35, grain=0.10):
    """Lays a watercolour wash of `colour` over the float RGB image where `mask` (0..1) is: soft-edged, a little
    granulated, darker where the paint pooled at its edges - mixed like real paint (multiplied onto what's under it)."""
    m = ndimage.gaussian_filter(mask.astype(float), 1.2)
    if COVER is not None and COVER.shape == m.shape: COVER[:] = np.maximum(COVER, m * alpha)
    g = 1 + grain * smooth_noise(m.shape, 1.5, seed) + grain * 0.6 * smooth_noise(m.shape, 12, seed + 7)
    rim = np.clip(m - ndimage.gaussian_filter(m, 4), 0, 1) * edge * 4
    a = np.clip(m * alpha * g + rim * alpha, 0, 1)[..., None]
    c = np.array(colour, float) / 255
    img *= (1 - a) + a * c


def gradient_wash(img, mask, top, bottom, y0, y1, alpha=0.8, seed=0):
    """A wash that changes colour from `top` (at y0) to `bottom` (at y1) - a sky, say."""
    h = img.shape[0]
    t = np.clip((np.arange(h) - y0) / max(y1 - y0, 1), 0, 1)[:, None, None]
    col = np.array(top, float) * (1 - t) + np.array(bottom, float) * t
    m = ndimage.gaussian_filter(mask.astype(float), 1.2)
    g = 1 + 0.08 * smooth_noise(m.shape, 1.5, seed) + 0.1 * smooth_noise(m.shape, 30, seed + 3)
    a = np.clip(m * alpha * g, 0, 1)[..., None]
    img *= (1 - a) + a * col / 255


def bloom(img, x, y, r, strength=0.12):
    """A watercolour 'bloom': a paler patch where water crept back into drying paint."""
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - x, yy - y) / r
    a = np.clip(1 - d, 0, 1) ** 0.6 * strength
    img += (255 - img) * a[..., None] * 0.5


class Pen:
    """Draws ink onto an alpha canvas (SS-sized). `boil` picks which redraw this is: each stroke has its own fixed
    hand-wobble, plus a smaller one that changes with the boil - so the lines move a little between frames."""
    def __init__(self, w, h, boil=0, seed=0):
        self.img = Image.new('L', (w * SS, h * SS), 0); self.d = ImageDraw.Draw(self.img)
        self.boil = boil; self.n = seed; self.weight = 1.0

    def stroke(self, pts, width=1.2, wobble=WOBBLE, taper=True, closed=False):
        """One ink stroke along pts (640-space points): resampled every few px, wobbled sideways, thicker in the middle
        (pressure), thin at the ends."""
        self.n += 1
        pts = np.array(pts, float)
        if closed: pts = np.vstack([pts, pts[:1]])
        seg = np.hypot(*np.diff(pts, axis=0).T); L = seg.sum()
        if L < 0.5: return
        s = np.concatenate([[0], np.cumsum(seg)])
        k = max(int(L / 2.5), 2)
        t = np.linspace(0, L, k)
        p = np.stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])], 1)
        tang = np.gradient(p, axis=0); tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
        nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
        rf = np.random.default_rng(self.n * 7919)                        # (this stroke's own hand)
        rb = np.random.default_rng(self.n * 7919 + 101 * (self.boil + 1))   # (and this redraw's)
        off = np.zeros(k)
        for amp, rng in ((wobble - BOIL_AMP, rf), (BOIL_AMP, rb)):
            for f in (0.05, 0.13, 0.31):
                off += amp / 2.2 * np.sin(t * f + rng.uniform(0, 6.3)) * (0.6 if f > 0.2 else 1)
        p = p + nrm * off[:, None]
        u = t / L
        press = (np.sin(u * math.pi) ** 0.5 if taper else np.ones(k)) * (0.75 + 0.25 * np.sin(t * 0.07 + rf.uniform(0, 6)))
        wid = np.maximum(width * self.weight * press * SS, 0.6)
        P = p * SS
        for i in range(k - 1):
            self.d.line([tuple(P[i]), tuple(P[i + 1])], fill=255, width=max(1, int(round(wid[i]))))
            r = wid[i] / 2
            if r > 0.9: self.d.ellipse([P[i][0] - r, P[i][1] - r, P[i][0] + r, P[i][1] + r], fill=255)

    def hatch(self, mask, spacing=6, angle=-0.9, width=0.7, every=1):
        """Hatching (parallel thin strokes) across a 640-space boolean mask."""
        h, w = mask.shape
        ca, sa = math.cos(angle), math.sin(angle)
        diag = int(math.hypot(w, h))
        for c in range(-diag, diag, spacing * every):
            pts = []
            for t in np.arange(-diag, diag, 2):
                x, y = c * -sa + t * ca + w / 2, c * ca + t * sa + h / 2
                inside = 0 <= x < w and 0 <= y < h and mask[int(y), int(x)]
                if inside: pts.append((x, y))
                elif len(pts) > 3: self.stroke(pts, width, wobble=0.6); pts = []
                else: pts = []
            if len(pts) > 3: self.stroke(pts, width, wobble=0.6)

    def alpha(self):
        """The ink as a 640-space alpha (0..1), shrunk smoothly."""
        return np.array(self.img.resize((self.img.width // SS, self.img.height // SS), Image.LANCZOS), float) / 255


def ellipse_pts(cx, cy, rx, ry, a0=0, a1=2 * math.pi, n=48, rot=0.0):
    """Points round an ellipse (or an arc of one), optionally turned by rot radians."""
    out = []
    for a in np.linspace(a0, a1, n):
        x, y = rx * math.cos(a), ry * math.sin(a)
        out.append((cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot)))
    return out


def poly_mask(w, h, pts):
    """A 640-space boolean mask filled inside a polygon."""
    im = Image.new('L', (w, h), 0); ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=1)
    return np.array(im, bool)


def ink_rgba(alpha):
    """Ink lines as an RGBA image (ink colour, the lines' alpha)."""
    out = np.zeros(alpha.shape + (4,), np.uint8)
    out[..., :3] = INK; out[..., 3] = np.clip(alpha * 255 * 1.15, 0, 255)
    return out


def save(arr, name, colours=256):
    """Writes an RGBA/RGB array as a palette PNG (imagequant), small."""
    import imagequant
    im = Image.fromarray(arr.astype(np.uint8)).convert('RGBA')
    q = imagequant.quantize_pil_image(im, dithering_level=0.6, max_colors=colours, min_quality=0, max_quality=100)
    q.save(os.path.join(OUT, name), optimize=True)
    print(f'{name}: {os.path.getsize(os.path.join(OUT, name)) // 1024} KB')


# ------------------------------------------------------------------ the background
def background():
    """The drawn world behind him: a watercolour dusk over a checkerboard plain running to a low horizon, long shadows,
    a few clouds, a row of tiny cypresses. Returns (wash RGB uint8, [ink alpha] x BOIL)."""
    img = paper(W, H, 3)
    sky = np.zeros((H, W), bool); sky[:HORIZON + 2] = True
    gradient_wash(img, sky, (78, 104, 150), (238, 196, 140), 0, HORIZON, alpha=0.85, seed=11)
    gradient_wash(img, sky, (150, 90, 130), (200, 120, 120), 40, HORIZON - 30, alpha=0.25, seed=12)
    for x, y, r in ((90, 60, 46), (380, 110, 60), (560, 40, 38), (250, 150, 30)): bloom(img, x, y, r)
    ground = ~sky
    gradient_wash(img, ground, (214, 160, 102), (150, 86, 70), HORIZON, H, alpha=0.8, seed=13)
    tiles = np.zeros((H, W), bool)                                               # the checkerboard's dark squares
    yy, xx = np.mgrid[0:H, 0:W]
    depth = np.where(yy > HORIZON, 60.0 / np.maximum(yy - HORIZON, 0.5), 0)      # (distance into the plain)
    gx = (xx - VANISH[0]) * depth / 24
    tiles = (yy > HORIZON + 1) & ((np.floor(gx) + np.floor(depth * 2.2)).astype(int) % 2 == 0)
    wash(img, tiles, (96, 58, 56), alpha=0.55, seed=14, edge=0.2)
    shadow = poly_mask(W, H, [(40, 300), (160, 230), (175, 236), (70, 330)]) | poly_mask(W, H, [(560, 260), (640, 228), (640, 248), (585, 275)])
    wash(img, shadow, (60, 40, 70), alpha=0.35, seed=15)
    for cx, cy, s in ((120, 70, 1.0), (430, 46, 0.8), (300, 140, 0.6)):         # clouds: pale, flat-bottomed
        m = np.zeros((H, W), bool)
        for dx, dy, r in ((0, 0, 22), (24, -8, 26), (50, 2, 20), (-22, 4, 16)):
            m |= np.hypot(xx - (cx + dx * s), (yy - (cy + dy * s)) * 1.15) < r * s
        m &= yy < cy + 10 * s
        wash(img, m, (252, 244, 236), alpha=0.75, seed=int(cx), edge=0.15)
    for i, x in enumerate(range(150, 520, 37)):                                  # tiny cypresses on the horizon
        if 260 < x < 380: continue
        m = poly_mask(W, H, [(x, HORIZON + 1), (x + 3, HORIZON - 16 - (i % 3) * 3), (x + 6, HORIZON + 1)])
        wash(img, m, (50, 70, 56), alpha=0.8, seed=40 + i)
    inks = []
    for b in range(BOIL):
        pen = Pen(W, H, b, seed=1000)
        pen.stroke([(0, HORIZON), (W, HORIZON)], 1.1, taper=False)
        for k in range(-14, 15):                                                  # the checkerboard's lines to the horizon
            x0 = VANISH[0] + k * 24 * (H - HORIZON) / 60
            pen.stroke([(VANISH[0] + (x0 - VANISH[0]) * 0.03, HORIZON + 1), (x0, H)], 0.8)
        for j in range(1, 40):
            y = HORIZON + 60 / (j / 2.2)
            if y < H and y - HORIZON > 1.5: pen.stroke([(0, y), (W, y)], 0.6 + 0.4 * min((y - HORIZON) / 60, 1), wobble=1.0)
        pen.hatch(shadow, spacing=5, width=0.6)
        for cx, cy, s in ((120, 70, 1.0), (430, 46, 0.8), (300, 140, 0.6)):
            for dx, dy, r, a0, a1 in ((0, 0, 22, 3.3, 5.6), (24, -8, 26, 3.6, 6.0), (50, 2, 20, 4.2, 6.6), (-22, 4, 16, 2.6, 4.7)):
                pen.stroke(ellipse_pts(cx + dx * s, cy + dy * s, r * s, r * s / 1.15, a0, a1, 20), 0.9)
            pen.stroke([(cx - 38 * s, cy + 10 * s), (cx + 70 * s, cy + 10 * s)], 0.8)
        for i, x in enumerate(range(150, 520, 37)):
            if 260 < x < 380: continue
            pen.stroke([(x, HORIZON + 1), (x + 3, HORIZON - 16 - (i % 3) * 3), (x + 6, HORIZON + 1)], 0.7)
        inks.append(pen.alpha())
    return np.clip(img, 0, 255).astype(np.uint8), inks


# ------------------------------------------------------------------ the desk (traced from the real one)
def desk_render():
    """Renders his real counter and desk things alone (no him, no PS1 crunch) at 640x360. Returns RGBA float."""
    import bpy
    import hanz_anim as A
    cam, mats = A.setup()
    A.desk('show')
    sc = bpy.context.scene
    sc.render.use_border = False; sc.render.resolution_percentage = 100 * A.SCALE; sc.render.film_transparent = True
    path = os.path.join('/tmp', 'hanz_desk_clean.png')
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
    return np.array(Image.open(path).convert('RGBA')).astype(float)


DESK_TONES = 11                                  # how many flat colours the desk is split into (k-means on its render)


def desk_drawn(src):
    """The desk redrawn by hand from its clean render: split into DESK_TONES flat areas of colour (k-means), each laid
    on as a clean watercolour wash lightened toward the paper; ink along every border between them and round the
    outside; hatching in the darkest ones. Covers a little more than the real desk (so no gap shows round him).
    Returns (RGBA uint8, [ink alpha] x BOIL)."""
    from scipy.cluster.vq import kmeans2
    a = src[..., 3] / 255
    cover = ndimage.binary_dilation(a > 0.4, iterations=3)
    inside = a > 0.4
    rgb = src[..., :3]
    px = rgb[inside].astype(float)
    cent, lab = kmeans2(px, DESK_TONES, seed=5, minit='++')
    labels = np.full((H, W), -1, int); labels[inside] = lab
    # tidy the areas: each pixel takes the most common label around it (twice), and the cover ring takes its neighbour's
    for _ in range(2):
        best = np.zeros((H, W)); out = labels.copy()
        for k in range(DESK_TONES):
            c = ndimage.uniform_filter((labels == k).astype(float), 5)
            out = np.where((c > best) & cover, k, out); best = np.maximum(best, c * cover)
        labels = out
    img = paper(W, H, 21)
    pap = img / np.array(PAPER, float)
    flat = np.zeros((H, W, 3))
    for k in range(DESK_TONES):
        c = cent[k]; lum = c.mean()
        c = c + (c - lum) * 0.25                                                   # (a touch more colour)
        c = c * 0.72 + np.array(PAPER) * 0.28 + 6                                  # (lighter, like a wash on paper)
        flat[labels == k] = np.clip(c, 0, 255)
    g = 1 + 0.06 * smooth_noise((H, W), 1.5, 22) + 0.05 * smooth_noise((H, W), 10, 23)
    col = flat * pap * g[..., None]
    border = np.zeros((H, W), bool)
    for dy, dx in ((0, 1), (1, 0)):
        sh = np.roll(labels, (dy, dx), (0, 1)); border |= (sh != labels) & cover & np.roll(cover, (dy, dx), (0, 1))
    edge_in = cover & ~ndimage.binary_erosion(cover, iterations=1)
    pool = ndimage.gaussian_filter((border | edge_in).astype(float), 1.2)
    col *= 1 - np.clip(pool, 0, 1)[..., None] * 0.22                               # (the paint pools darker at its edges)
    out = np.zeros((H, W, 4), np.uint8)
    out[..., :3] = np.clip(col, 0, 255); out[..., 3] = cover * 255
    line_map = border | edge_in
    darkest = [k for k in range(DESK_TONES) if cent[k].mean() < 75]
    dark = np.isin(labels, darkest) & ndimage.binary_erosion(cover, iterations=3)
    inks = []
    for b in range(BOIL):
        dy = smooth_noise((H, W), 7, 300 + b) * BOIL_AMP + smooth_noise((H, W), 7, 299) * (WOBBLE - BOIL_AMP)
        dx = smooth_noise((H, W), 7, 400 + b) * BOIL_AMP + smooth_noise((H, W), 7, 399) * (WOBBLE - BOIL_AMP)
        yy, xx = np.mgrid[0:H, 0:W].astype(float)
        moved = ndimage.map_coordinates(ndimage.binary_dilation(line_map).astype(float) * 0.85 + line_map * 0.15, [yy + dy, xx + dx], order=1)
        ink = np.clip(ndimage.gaussian_filter(moved, 0.4) * 1.3, 0, 1)
        pen = Pen(W, H, b, seed=2000); pen.hatch(dark, spacing=5, width=0.55)
        inks.append(np.maximum(ink, pen.alpha() * 0.75) * ndimage.binary_dilation(cover, iterations=2))
    return out, inks


# ------------------------------------------------------------------ the surreal things
def thing_eye(pen, img, w, h, f):
    """An EYE for a moon: almond lids, long lashes, a teal iris, a black pupil with a glint (f == 3: it blinks)."""
    cx, cy, rx, ry = w / 2, h / 2 + 4, w / 2 - 10, h / 2 - 16
    yy, xx = np.mgrid[0:h, 0:w]
    if f == 3:                                                                    # (blink: just the closed lid)
        pen.stroke(ellipse_pts(cx, cy, rx, ry * 0.25, 0.15, math.pi - 0.15, 30), 1.6)
        for i in range(9):
            a = 0.35 + i * (math.pi - 0.7) / 8
            x0, y0 = cx + rx * math.cos(a), cy + ry * 0.25 * math.sin(a)
            pen.stroke([(x0, y0), (x0 + (x0 - cx) * 0.12, y0 + 9)], 1.0)
        return
    white = (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1)
    wash(img, white, (250, 246, 236), 0.9, 51, edge=0.25)
    iris = np.hypot(xx - cx, yy - cy) < ry * 0.82
    wash(img, iris & white, (60, 140, 140), 0.85, 52)
    wash(img, (np.hypot(xx - cx, yy - cy) < ry * 0.38) & white, (20, 16, 18), 0.95, 53, edge=0)
    pen.stroke(ellipse_pts(cx, cy, rx, ry, math.pi + 0.15, 2 * math.pi - 0.15, 30), 1.6)
    pen.stroke(ellipse_pts(cx, cy, rx, ry, 0.15, math.pi - 0.15, 30), 1.4)
    pen.stroke(ellipse_pts(cx, cy, ry * 0.82, ry * 0.82, 0, 2 * math.pi, 40), 1.0, closed=False)
    for i in range(11):                                                           # lashes
        a = math.pi + 0.25 + i * (math.pi - 0.5) / 10
        x0, y0 = cx + rx * math.cos(a), cy + ry * math.sin(a)
        pen.stroke([(x0, y0), (x0 + (x0 - cx) * 0.18, y0 - 12 - 4 * math.sin(i))], 1.1)
    pen.stroke(ellipse_pts(cx - ry * 0.18, cy - ry * 0.2, 3, 3, 0, 6.3, 10), 0.8)


def thing_fish(pen, img, w, h, f):
    """A FISH floating through the sky with a little house on its back (one window lit), a line trailing below."""
    yy, xx = np.mgrid[0:h, 0:w]
    body = (((xx - 58) / 44) ** 2 + ((yy - 52) / 17) ** 2 < 1)
    tail = poly_mask(w, h, [(100, 52), (122, 36), (118, 52), (122, 68)])
    wash(img, body | tail, (226, 120, 72), 0.85, 61)
    house = poly_mask(w, h, [(42, 38), (42, 22), (52, 12), (62, 22), (62, 38)])
    wash(img, house, (232, 222, 196), 0.9, 62)
    wash(img, poly_mask(w, h, [(48, 24), (55, 24), (55, 31), (48, 31)]), (250, 200, 80), 0.95, 63, edge=0)
    pen.stroke(ellipse_pts(58, 52, 44, 17, 0.3, 2 * math.pi - 0.3, 40), 1.3)
    pen.stroke([(100, 46), (122, 36), (117, 52), (122, 68), (100, 58)], 1.2)
    pen.stroke(ellipse_pts(26, 48, 3.5, 3.5, 0, 6.3, 12), 1.0)
    for k in range(3): pen.stroke(ellipse_pts(60 + k * 11, 52, 9, 13, -0.9, 0.9, 10), 0.7)
    pen.stroke([(42, 38), (42, 22), (52, 12), (62, 22), (62, 38)], 1.1)
    pen.stroke([(48, 24), (55, 24), (55, 31), (48, 31), (48, 24)], 0.8)
    pen.stroke([(70, 69), (68, 80), (72, 92), (69, h - 2)], 0.7)


def thing_stairs(pen, img, w, h, f):
    """A STAIRCASE climbing up out of the plain in a zig-zag into a cloud, an open DOOR at the top spilling light."""
    yy, xx = np.mgrid[0:h, 0:w]
    cloud = np.zeros((h, w), bool)
    for dx, dy, r in ((60, 30, 26), (84, 22, 22), (36, 28, 20), (100, 34, 16)): cloud |= np.hypot(xx - dx, yy - dy) < r
    wash(img, cloud, (248, 240, 236), 0.85, 71, edge=0.12)
    door = poly_mask(w, h, [(56, 26), (56, 2), (74, 2), (74, 26)])
    wash(img, door, (255, 214, 120), 0.9, 72, edge=0.4)
    steps = []
    x, y = 20, h - 4
    for i in range(12):
        steps.append((x, y)); y -= 11; steps.append((x, y)); x += 6 if (i // 4) % 2 == 0 else -6
    side = poly_mask(w, h, [(px, py) for px, py in steps] + [(steps[-1][0] + 10, steps[-1][1]), (steps[0][0] + 10, steps[0][1])])
    wash(img, side, (150, 110, 140), 0.6, 73)
    pen.stroke(steps, 1.1)
    pen.stroke([(px + 10, py) for px, py in steps], 0.9)
    for px, py in steps[::2]: pen.stroke([(px, py), (px + 10, py)], 0.8)
    for dx, dy, r, a0, a1 in ((60, 30, 26, 3.4, 5.9), (84, 22, 22, 3.8, 6.1), (36, 28, 20, 2.8, 4.9), (100, 34, 16, 4.6, 6.8)):
        pen.stroke(ellipse_pts(dx, dy, r, r, a0, a1, 18), 0.9)
    pen.stroke([(56, 26), (56, 2), (74, 2), (74, 26)], 1.1)
    pen.stroke([(74, 2), (82, 6), (82, 28), (74, 26)], 0.9)                       # (the door, swung open)


def thing_teacup(pen, img, w, h, f):
    """A TEACUP tipped over in mid-air - its tea pours UP, in a wavy brown ribbon, into a little cloud above it."""
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy, rot = 40, h - 30, -0.55                                             # the cup's middle and its tilt
    R = lambda px, py: (cx + px * math.cos(rot) - py * math.sin(rot), cy + px * math.sin(rot) + py * math.cos(rot))
    body = [R(-18, -6)] + [R(18 * math.cos(t), -6 + 16 * math.sin(t)) for t in np.linspace(0, math.pi, 16)][::-1] + [R(18, -6)]
    wash(img, poly_mask(w, h, body), (238, 242, 248), 0.95, 81)
    wash(img, poly_mask(w, h, ellipse_pts(*R(0, -6), 18, 5, rot=rot)), (150, 92, 52), 0.9, 84)
    stream = [R(10, -9), (52, 52), (44, 38), (50, 26)]
    left = [(x - 4, y) for x, y in stream]; right = [(x + 4, y) for x, y in stream]
    wash(img, poly_mask(w, h, left + right[::-1]), (150, 92, 52), 0.85, 82)
    cloud = np.zeros((h, w), bool)
    for dx, dy, r in ((46, 18, 15), (62, 14, 13), (32, 20, 11)): cloud |= np.hypot(xx - dx, yy - dy) < r
    wash(img, cloud, (248, 242, 236), 0.9, 83, edge=0.15)
    pen.stroke(body, 1.4)
    pen.stroke(ellipse_pts(*R(0, -6), 18, 5, rot=rot), 1.1)
    pen.stroke(ellipse_pts(*R(-21, 2), 6, 7, 1.6, 4.7, 12, rot=rot), 1.2)           # (the handle)
    pen.stroke(left, 1.0); pen.stroke(right, 1.0)
    pen.stroke([R(-26, 16), R(26, 16)], 1.0)                                        # (its saucer, falling with it)
    for dx, dy, r, a0, a1 in ((46, 18, 15, 3.3, 6.0), (62, 14, 13, 3.9, 6.3), (32, 20, 11, 2.8, 4.8)):
        pen.stroke(ellipse_pts(dx, dy, r, r, a0, a1, 14), 1.0)
    pen.stroke([(24, 30), (76, 30)], 0.9)


def thing_window(pen, img, w, h, f):
    """A WINDOW frame standing alone on the plain - through it, night: deep blue, stars and a thin moon."""
    yy, xx = np.mgrid[0:h, 0:w]
    glass = poly_mask(w, h, [(10, 8), (w - 10, 8), (w - 10, h - 22), (10, h - 22)])
    wash(img, glass, (34, 40, 86), 0.95, 91, edge=0.3)
    rng = np.random.default_rng(92)
    for _ in range(14):
        sx, sy = rng.uniform(14, w - 14), rng.uniform(12, h - 26)
        wash(img, np.hypot(xx - sx, yy - sy) < 1.2, (255, 250, 220), 1.0, 93, edge=0)
    moon = (np.hypot(xx - (w - 26), yy - 26) < 9) & ~(np.hypot(xx - (w - 22), yy - 23) < 8)
    wash(img, moon, (255, 236, 170), 1.0, 94, edge=0)
    wash(img, poly_mask(w, h, [(10, h - 22), (w - 10, h - 22), (w + 30, h - 2), (40, h - 2)]), (60, 40, 70), 0.3, 95)   # its shadow
    pen.stroke([(8, 6), (w - 8, 6), (w - 8, h - 20), (8, h - 20), (8, 6)], 1.4)
    pen.stroke([(w / 2, 6), (w / 2, h - 20)], 1.0); pen.stroke([(8, (h - 14) / 2), (w - 8, (h - 14) / 2)], 1.0)
    pen.stroke([(4, h - 18), (w - 4, h - 18)], 1.1)


def thing_tree(pen, img, w, h, f):
    """A bare TREE growing out of the plain whose branches end in little open hands - one of them holds a pocket watch."""
    yy, xx = np.mgrid[0:h, 0:w]
    trunk = poly_mask(w, h, [(w / 2 - 7, h), (w / 2 - 3, h - 62), (w / 2 + 3, h - 62), (w / 2 + 8, h)])
    wash(img, trunk, (96, 70, 60), 0.85, 101)
    pen.stroke([(w / 2 - 7, h - 1), (w / 2 - 3, h - 62)], 1.8); pen.stroke([(w / 2 + 8, h - 1), (w / 2 + 3, h - 62)], 1.8)
    branches = [((w / 2, h - 62), (16, 30)), ((w / 2, h - 62), (w - 18, 22)), ((w / 2, h - 70), (w / 2 - 4, 10)),
                ((w / 2 - 2, h - 88), (12, 66)), ((w / 2 + 2, h - 82), (w - 10, 70))]
    for i, ((x0, y0), (x1, y1)) in enumerate(branches):
        mx, my = (x0 + x1) / 2 + (y1 - y0) * 0.12, (y0 + y1) / 2
        pen.stroke([(x0, y0), (mx, my), (x1, y1)], 1.6)
        d = math.atan2(y1 - my, x1 - mx)
        hx, hy = x1 + 3 * math.cos(d), y1 + 3 * math.sin(d)
        wash(img, np.hypot(xx - hx, yy - hy) < 4, (238, 214, 196), 0.9, 103 + i)    # (a little palm...)
        pen.stroke(ellipse_pts(hx, hy, 4, 4, 0, 6.3, 12), 0.9)
        for k in (-0.75, -0.25, 0.25, 0.75):                                          # (...four fingers...)
            a = d + k
            pen.stroke([(hx + 3.5 * math.cos(a), hy + 3.5 * math.sin(a)), (hx + 9 * math.cos(a), hy + 9 * math.sin(a))], 0.9, taper=False)
        a = d + 1.4                                                                   # (...and a thumb)
        pen.stroke([(hx + 3.5 * math.cos(a), hy + 3.5 * math.sin(a)), (hx + 7 * math.cos(a), hy + 7 * math.sin(a))], 0.9, taper=False)
    wx, wy = branches[1][1]
    wash(img, np.hypot(xx - (wx + 4), yy - (wy + 14)) < 7, (232, 196, 90), 0.95, 102, edge=0.3)
    pen.stroke(ellipse_pts(wx + 4, wy + 14, 7, 7, 0, 6.3, 16), 1.1)
    pen.stroke([(wx + 4, wy + 14), (wx + 4, wy + 9)], 0.8); pen.stroke([(wx + 4, wy + 14), (wx + 8, wy + 15)], 0.8)
    pen.stroke([(wx + 2, wy + 4), (wx + 4, wy + 7)], 0.7)                           # (its chain, hooked on a finger)


# name -> (drawing fn, x, y, w, h on the 640x360 view, extra frames). Where they stand is chosen to sit behind him and
# around the cards: high in the sky, or on the plain behind the counter.
THINGS = {
    'eye': (thing_eye, 476, 10, 120, 74, 1),
    'fish': (thing_fish, 150, 28, 128, 100, 0),
    'stairs': (thing_stairs, 18, 32, 112, 180, 0),
    'teacup': (thing_teacup, 296, 0, 88, 100, 0),
    'window': (thing_window, 548, 128, 72, 100, 0),
    'tree': (thing_tree, 140, 100, 112, 116, 0),
}


def things():
    """Draws every thing's frames (wash stays put, ink boils; the eye adds a blink) into one sheet, a row each.
    Returns (sheet RGBA uint8, the table for lostDrawn.js)."""
    rows, table = [], {}
    for name, (fn, x, y, w, h, extra) in THINGS.items():
        frames = []
        for b in range(BOIL + extra):
            global COVER
            img = np.ones((h, w, 3)) * 255.0; COVER = np.zeros((h, w))
            pen = Pen(w, h, b % BOIL, seed=sum(map(ord, name)) * 13); pen.weight = 1.25
            fn(pen, img, w, h, b)
            ink = pen.alpha()
            a = np.clip(COVER * 1.25, 0, 1); COVER = None
            paint = 255 - (255 - img) / np.maximum(a, 0.05)[..., None]              # (the paint's own colour, not faded to white)
            alpha = np.maximum(a, ink)
            rgb = (paint * a[..., None] * (1 - ink[..., None]) + np.array(INK) * ink[..., None]) / np.maximum(alpha, 1e-3)[..., None]
            frames.append(np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8))
        rows.append(frames)
        table[name] = {'x': x, 'y': y, 'w': w, 'h': h, 'n': len(frames)}
    sw = max(sum(f.shape[1] for f in r) for r in rows); sh = sum(r[0].shape[0] for r in rows)
    sheet = np.zeros((sh, sw, 4), np.uint8); oy = 0
    for (name, _), r in zip(THINGS.items(), rows):
        table[name]['sy'] = oy
        ox = 0
        for f in r: sheet[oy:oy + f.shape[0], ox:ox + f.shape[1]] = f; ox += f.shape[1]
        oy += r[0].shape[0]
    return sheet, table


# ------------------------------------------------------------------ main
def main():
    """Draws the whole drawn room and writes its PNGs and lostDrawn.js (see the top of the file)."""
    ap = argparse.ArgumentParser(); ap.add_argument('--preview'); a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    bg, bg_inks = background()
    save(bg, 'drawn_wash.png')
    for i, ink in enumerate(bg_inks): save(ink_rgba(ink), f'drawn_ink_{i}.png', 32)
    desk, desk_inks = desk_drawn(desk_render())
    save(desk, 'drawn_desk.png')
    for i, ink in enumerate(desk_inks): save(ink_rgba(ink), f'drawn_desk_ink_{i}.png', 32)
    sheet, table = things()
    save(sheet, 'drawn_things.png', 128)
    with open(TABLE, 'w') as fh:
        fh.write('// THE DRAWN ROOM (what his room becomes when he snaps his fingers) - generated by tools/sprites/hanz_drawn.py:\n')
        fh.write('// do not edit by hand. things[name]: where it pops in (x, y, w, h on the 640x360 view), its row in\n')
        fh.write('// drawn_things.png (sy) and how many frames it has (n: the first `boil` are the boiling ink; the eye adds a blink).\n')
        fh.write('export const LOST_DRAWN = ' + json.dumps({'boil': BOIL, 'things': table}) + ';\n')
    if a.preview:
        can = Image.fromarray(bg).convert('RGBA')
        can.alpha_composite(Image.fromarray(ink_rgba(bg_inks[0])))
        for name, t in table.items():
            can.alpha_composite(Image.fromarray(sheet[t['sy']:t['sy'] + t['h'], 0:t['w']]), (t['x'], t['y']))
        can.alpha_composite(Image.fromarray(desk))
        can.alpha_composite(Image.fromarray(ink_rgba(desk_inks[0])))
        can.convert('RGB').save(a.preview)


if __name__ == '__main__':
    main()
