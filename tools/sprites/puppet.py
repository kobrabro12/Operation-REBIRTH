"""A small pixel-art puppet rig: cuts a sprite into parts (arm, head, legs, cape...), poses each part
with rotations and offsets around its joint, and renders smooth animations from a few keyframes.

Used by tools/sprites/*_moves.py to animate every move from a fighter's single idle drawing.

  - Parts are pixel masks of the base frame, each with a joint (pivot), a parent and a draw order.
    A child (a hand, a head) follows its parent's transform, then adds its own.
  - Rotation uses RotSprite: the part is upscaled 8x with EPX (Scale2x) three times, rotated with
    nearest-neighbour sampling, and sampled back at 1x - so rotated pixel art keeps clean edges
    instead of turning into jaggies.
  - Animations are keyframes in game ticks; poses between keys are eased (ease-in-out by default,
    'back' overshoots and settles, 'out' snaps then slows), which is what keeps motion loose rather
    than robotic. Each key can also squash/stretch the whole body around the feet.
  - Smears: fast-moving parts can leave 1-2 faded afterimages of where they were a moment ago.
"""
import math
import numpy as np
from PIL import Image

# ---------------------------------------------------------------- RotSprite helpers
def _pack(a):  # RGBA uint8 array -> uint32 per pixel
    return (a[..., 0].astype(np.uint32) << 24) | (a[..., 1].astype(np.uint32) << 16) | (a[..., 2].astype(np.uint32) << 8) | a[..., 3]

def _unpack(p):
    return np.stack([(p >> 24) & 255, (p >> 16) & 255, (p >> 8) & 255, p & 255], -1).astype(np.uint8)

def epx(p):
    """Scale2x on a packed uint32 image."""
    A = np.pad(p, 1, mode='edge')
    P = A[1:-1, 1:-1]; up = A[:-2, 1:-1]; dn = A[2:, 1:-1]; lf = A[1:-1, :-2]; rt = A[1:-1, 2:]
    o1 = np.where((lf == up) & (lf != dn) & (up != rt), up, P)
    o2 = np.where((up == rt) & (up != lf) & (rt != dn), rt, P)
    o3 = np.where((dn == lf) & (dn != rt) & (lf != up), lf, P)
    o4 = np.where((rt == dn) & (rt != up) & (dn != lf), dn, P)
    h, w = P.shape
    out = np.empty((h * 2, w * 2), np.uint32)
    out[0::2, 0::2] = o1; out[0::2, 1::2] = o2; out[1::2, 0::2] = o3; out[1::2, 1::2] = o4
    return out

def up8(rgba):
    p = _pack(rgba)
    for _ in range(3): p = epx(p)
    return p

# ---------------------------------------------------------------- affine helpers (3x3 matrices)
def T(dx, dy): return np.array([[1, 0, dx], [0, 1, dy], [0, 0, 1]], float)
def R(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], float)
def S(sx, sy): return np.array([[sx, 0, 0], [0, sy, 0], [0, 0, 1]], float)

# ---------------------------------------------------------------- easing
EASE = {
    'linear': lambda k: k,
    'inout': lambda k: k * k * (3 - 2 * k),
    'in': lambda k: k * k,
    'out': lambda k: 1 - (1 - k) * (1 - k),
    'back': lambda k: 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2,   # overshoot, then settle
    'snap': lambda k: 1 - (1 - k) ** 4,
}

class Part:
    """variants: optional extra drawings of the same part (e.g. the flickering frames of a flame), cycled
    by the frame counter passed to Rig.render.
    upright: 0..1 - how much the part cancels its parents' rotation (a flame keeps burning upward when
    the arm holding it swings around). drag: how much it trails behind its parent's swing."""
    def __init__(self, name, mask, pivot, parent=None, z=0, variants=None, upright=0, drag=0, sway=0):
        self.name, self.mask, self.pivot, self.parent, self.z, self.variants = name, mask, pivot, parent, z, variants
        self.upright, self.drag, self.sway = upright, drag, sway

class Rig:
    """base: RGBA numpy array (H, W, 4) of the drawing. parts: list of Part (masks over base).
    canvas: (W, H) of the output frames; offset: where the base's (0, 0) lands on the canvas.
    feet: (x, y) in base coords - the root's squash/stretch and rotation centre."""
    def __init__(self, base, parts, canvas, offset, feet):
        self.base, self.canvas, self.offset, self.feet = base, canvas, offset, feet
        self.parts = {p.name: p for p in parts}
        self.order = sorted(parts, key=lambda p: p.z)
        H, W = base.shape[:2]
        self.up = {}
        for p in parts:                                   # each part alone, upscaled 8x once
            srcs = p.variants or [base]
            ups = []
            for src in srcs:
                img = np.zeros_like(base); img[p.mask] = src[p.mask]
                ups.append(up8(img))
            self.up[p.name] = ups
        cw, ch = canvas
        ys, xs = np.mgrid[0:ch, 0:cw]
        self.grid = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5, np.ones(xs.size)])

    def matrix(self, name, pose):
        """Base -> canvas transform of a part for a pose {part: (angle, dx, dy)}, root: pose['root']."""
        p = self.parts[name]
        a, dx, dy, sx, sy = (list(pose.get(name, ())) + [0, 0, 0, 1, 1][len(pose.get(name, ())):])[:5]
        if abs(sx) < 0.05: sx = 0.05 if sx >= 0 else -0.05      # a part turning round passes through zero width
        if abs(sy) < 0.05: sy = 0.05
        if p.upright and p.parent: a -= p.upright * self.world_angle(p.parent, pose)
        if (p.drag or p.sway) and p.parent and '_prev' in pose:
            d = self.world_angle(p.parent, pose['_prev']) - self.world_angle(p.parent, pose)   # trails behind the swing
            pr, cr = list(pose['_prev'].get('root', ())) + [0, 0, 0], list(pose.get('root', ())) + [0, 0, 0]
            v = (cr[1] - pr[1]) * 6 - (cr[2] - pr[2]) * 3                                       # streams back when the body lunges or jumps
            a += max(-60, min(60, p.drag * d - p.sway * v))
        M = T(dx, dy) @ T(*p.pivot) @ R(a) @ S(sx, sy) @ T(-p.pivot[0], -p.pivot[1])
        if p.parent: return self.matrix(p.parent, pose) @ M
        ra, rdx, rdy, sx, sy = (list(pose.get('root', ())) + [0, 0, 0, 1, 1][len(pose.get('root', ())):])[:5]
        fx, fy = self.feet
        root = T(self.offset[0] + rdx, self.offset[1] + rdy) @ T(fx, fy) @ R(ra) @ S(sx, sy) @ T(-fx, -fy)
        return root @ M

    def world_angle(self, name, pose):
        p = self.parts[name]
        a = (list(pose.get(name, ())) + [0])[0]
        if p.parent: return a + self.world_angle(p.parent, pose)
        return a + (list(pose.get('root', ())) + [0])[0]

    def render(self, pose, skip=(), only=None, tint=None, alpha=255, fi=0):
        cw, ch = self.canvas
        out = np.zeros((ch, cw), np.uint32)
        skip = set(skip) | set(pose.get('_hide', ()))      # a pose can hide props (e.g. a spray can only out for one move)
        for p in self.order:
            if p.name in skip or (only and p.name not in only): continue
            Minv = np.linalg.inv(self.matrix(p.name, pose))
            src = Minv @ self.grid
            u = np.floor(src[0] * 8).astype(int); v = np.floor(src[1] * 8).astype(int)
            U = self.up[p.name][fi % len(self.up[p.name])]; H8, W8 = U.shape
            ok = (u >= 0) & (v >= 0) & (u < W8) & (v < H8)
            vals = np.zeros(u.size, np.uint32); vals[ok] = U[v[ok], u[ok]]
            vals = vals.reshape(ch, cw)
            hit = (vals & 255) > 0
            out[hit] = vals[hit]
        img = _unpack(out)
        if tint is not None:
            m = img[..., 3] > 0
            img[m, :3] = tint; img[m, 3] = alpha
        elif alpha != 255:
            img[img[..., 3] > 0, 3] = alpha
        return img

def lerp_pose(a, b, k):
    out = {}
    for key in (set(a) | set(b)):
        if key.startswith('_'):                            # flags (hidden parts...) switch over at the halfway point
            if key != '_prev': out[key] = (b if k >= 0.5 else a).get(key, ())
            continue
        va, vb = list(a.get(key, ())), list(b.get(key, ()))
        n = max(len(va), len(vb), 3 if key != 'root' else 5)
        dflt = [0, 0, 0, 1, 1]
        va = va + dflt[len(va):n]; vb = vb + dflt[len(vb):n]
        out[key] = tuple(x + (y - x) * k for x, y in zip(va, vb))
    return out

def pose_at(keys, t):
    """keys: [(tick, pose, ease)] sorted. The ease of a key shapes the motion INTO that key."""
    if t <= keys[0][0]: return keys[0][1]
    for (t0, p0, _), (t1, p1, e) in zip(keys, keys[1:]):
        if t <= t1:
            k = (t - t0) / max(1e-6, t1 - t0)
            return lerp_pose(p0, p1, EASE[e or 'inout'](k))
    return keys[-1][1]

def seg_ease(keys, t):
    for (t0, _, _), (t1, _, e) in zip(keys, keys[1:]):
        if t0 < t <= t1: return e or 'inout'
    return None

def fill_holes(img, max_px=6):
    """Pinholes: little pockets of transparency fully enclosed by the sprite (where two moving parts don't
    quite meet) are painted in from their neighbours, so no frame shows the background through the body."""
    from scipy import ndimage
    a = img[..., 3] > 0
    H, W = a.shape
    lab, n = ndimage.label(~a)
    if n < 2: return img
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) | {0}
    sizes = np.bincount(lab.ravel())
    for k in range(1, n + 1):
        if k in border or sizes[k] > max_px: continue
        todo = set(zip(*np.nonzero(lab == k)))
        while todo:                                                           # fill from the edge inward
            done = []
            for (y, x) in todo:
                cols = {}
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and img[yy, xx, 3] > 0:
                        c = tuple(int(v) for v in img[yy, xx]); cols[c] = cols.get(c, 0) + 1
                if cols: done.append(((y, x), max(cols, key=lambda c: (cols[c], -sum(c[:3])))))   # most common, darker on ties
            if not done: break
            for (y, x), c in done: img[y, x] = c; todo.discard((y, x))
    return img

def animate(rig, keys, ticks, step=2, smear=(), smear_tint=None, extra=None, flicker=3, center=None, life=None, holes=6):
    """Frames for an animation `ticks` long, one per `step` ticks. smear: parts that leave faded
    afterimages when they move fast. extra(img, t, pose) may draw effects into each frame."""
    frames = []
    feet = rig.feet
    if center: rig.feet = center            # spin around the middle of the body instead of the feet
    for t in range(0, ticks, step):
        pose = dict(pose_at(keys, t)); prev = dict(pose_at(keys, max(0, t - 3)))
        if life: pose = life(pose, t); prev = life(prev, max(0, t - 3))      # secondary motion layered on top
        pose['_prev'] = prev
        fi = t // flicker
        img = rig.render(pose, fi=fi)
        if smear and seg_ease(keys, t) in ('snap', 'out', 'linear'):   # only the strikes smear, not the wind-down
            for back, a in ((2, 120), (4, 60)):
                pp = pose_at(keys, max(0, t - back))
                if life: pp = life(dict(pp), max(0, t - back))
                if any(np.abs(np.array(pp.get(n, (0, 0, 0))[:1]) - np.array(pose.get(n, (0, 0, 0))[:1])).max() > 12 for n in smear):
                    ghost = rig.render(pp, only=smear, tint=smear_tint, alpha=a, fi=fi)
                    m = (img[..., 3] == 0) & (ghost[..., 3] > 0)
                    img[m] = ghost[m]
        if holes: fill_holes(img, holes)
        if extra: extra(img, t, pose)
        frames.append(img)
    rig.feet = feet
    return frames

def save_atlas(frames_by_move, path, cols=16):
    """Lay out every move's frames row-major in one sheet. Returns {move: [first frame, count]}."""
    allf, index = [], {}
    for name, fr in frames_by_move.items():
        index[name] = [len(allf), len(fr)]; allf += fr
    h, w = allf[0].shape[:2]
    rows = math.ceil(len(allf) / cols)
    sheet = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, f in enumerate(allf):
        sheet.alpha_composite(Image.fromarray(f, 'RGBA'), ((i % cols) * w, (i // cols) * h))
    sheet.save(path)
    return index

def contact(frames, path, scale=3, cols=12, bg=(120, 160, 220, 255)):
    """A contact sheet for checking an animation by eye."""
    h, w = frames[0].shape[:2]
    rows = math.ceil(len(frames) / cols)
    sheet = Image.new('RGBA', (w * cols, h * rows), bg)
    for i, f in enumerate(frames):
        sheet.alpha_composite(Image.fromarray(f, 'RGBA'), ((i % cols) * w, (i // cols) * h))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(path)
