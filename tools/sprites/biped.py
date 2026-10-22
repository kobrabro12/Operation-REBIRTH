"""Turning a hand-pixelled character (one finished 64x64 drawing) into a puppet with real limbs, so it can
be animated like NU and AERO: shoulders, elbows, wrists, hips, knees and ankles, each a separate layer.

  cut(base, rules)      splits the drawing into parts. `rules` is an ordered list of (name, test(x, y, rgb))
                        - the first rule a pixel passes decides its part.
  fill(layers, name, region)
                        paints the hidden pixels of a part (e.g. the chest behind the arm) by copying its
                        nearest visible pixel outward, so nothing shows a hole when the limb moves away.
  cap(layers, name, src, centre, r)
                        gives a limb a little round overlap at its joint (copied from the drawing), so a
                        bent elbow or knee never shows a gap.
  edge(layers, names, colour)
                        darkens the cut edges of limbs (where they were joined to another part) into an outline.
  World-direction poses: Aim(rig_info) builds poses from where each limb should POINT on screen (degrees:
  0 = forward, 90 = down, -90 = up, 180 = back) instead of joint angles, which is how an animator thinks.
"""
import math
import numpy as np

def cut(base, rules):
    H, W = base.shape[:2]
    layers, owner = {}, np.full((H, W), '', object)
    for name, _ in rules: layers[name] = np.zeros_like(base)
    for y in range(H):
        for x in range(W):
            p = base[y, x]
            if p[3] == 0: continue
            rgb = '%02x%02x%02x' % tuple(p[:3])
            for name, test in rules:
                if test(x, y, rgb):
                    layers[name][y, x] = p; owner[y, x] = name; break
    return layers, owner

def fill(layers, name, region):
    """Grow the part into `region` (bool mask), copying the nearest visible pixel of the part (row first,
    so stripes and trims carry on across the gap)."""
    a = layers[name]
    todo = region & (a[..., 3] == 0)
    H, W = todo.shape
    for _ in range(64):
        if not todo.any(): break
        solid = a[..., 3] > 0
        new = a.copy()
        for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            src = np.zeros_like(solid); src_px = np.zeros_like(a)
            ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
            xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
            src[yd, xd] = solid[ys, xs]; src_px[yd, xd] = a[ys, xs]
            m = todo & src & (new[..., 3] == 0)
            new[m] = src_px[m]
        a = new
        todo = region & (a[..., 3] == 0)
    layers[name] = a

def cap(layers, name, src, centre, r):
    """Copy the drawing's pixels in a disc round a joint into the part (under it, never over its own)."""
    a = layers[name]
    cx, cy = centre
    H, W = a.shape[:2]
    for y in range(max(0, int(cy - r)), min(H, int(cy + r) + 1)):
        for x in range(max(0, int(cx - r)), min(W, int(cx + r) + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5 and a[y, x, 3] == 0 and src[y, x, 3] > 0:
                a[y, x] = src[y, x]

def edge(layers, names, owner, colour):
    """Where a limb was cut from its neighbour, its border pixel becomes outline colour."""
    H, W = owner.shape
    col = np.array(list(colour) + [255], np.uint8)
    for n in names:
        a = layers[n]; solid = a[..., 3] > 0
        out = a.copy()
        for y in range(H):
            for x in range(W):
                if not solid[y, x] or owner[y, x] != n: continue
                for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and not solid[yy, xx] and owner[yy, xx] not in ('', n):
                        out[y, x] = col; break
        layers[n] = out

def hexc(s): return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

class Aim:
    """Poses by limb direction. bones: {part: (parent, base world direction in degrees)} - the direction the
    limb points in the drawing (shoulder->elbow, hip->knee...). Parts not listed take angles as given."""
    def __init__(self, bones):
        self.bones = bones
    def world_of(self, pose, part):
        """World rotation (degrees, relative to the drawing) that the part's parent chain adds."""
        total = 0
        p = self.bones.get(part, (None,))[0]
        while p:
            if p in pose: total += pose[p][0]
            p = self.bones.get(p, (None,))[0]
        return total + (pose.get('root', (0,))[0] if 'root' in pose else 0)
    def __call__(self, base=None, **kw):
        """kw: part=angle (relative, like any pose) or part=('w', direction[, dx, dy]) to point it on screen.
        Resolved parent-first, so a forearm's direction accounts for the upper arm's."""
        pose = dict(base or {})
        aims = {}
        for k, v in kw.items():
            if isinstance(v, tuple) and v and v[0] == 'w': aims[k] = v
            else: pose[k] = v
        def depth(part):
            d, p = 0, self.bones.get(part, (None,))[0]
            while p: d += 1; p = self.bones.get(p, (None,))[0]
            return d
        for part in sorted(aims, key=depth):
            v = aims[part]
            want = v[1]
            parent_rot = self.world_of(pose, part)
            rel = want - self.bones[part][1] - parent_rot
            rel = (rel + 180) % 360 - 180
            pose[part] = (rel,) + tuple(v[2:])
        return pose

def leg_ik(hip, ankle, l1, l2, knee_fwd=1):
    """Thigh and shin directions (degrees) that put the ankle at `ankle` from `hip`, the knee bending forward."""
    dx, dy = ankle[0] - hip[0], ankle[1] - hip[1]
    d = max(1e-3, min(l1 + l2 - 1e-3, math.hypot(dx, dy)))
    base = math.degrees(math.atan2(dy, dx))
    a = math.degrees(math.acos(max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))))
    thigh = base - a * knee_fwd                       # screen y is down: subtracting turns the knee toward +x
    kx, ky = hip[0] + l1 * math.cos(math.radians(thigh)), hip[1] + l1 * math.sin(math.radians(thigh))
    shin = math.degrees(math.atan2(ankle[1] - ky, ankle[0] - kx))
    return thigh, shin

class Body:
    """Whole-body poses the way an animator blocks them:
      hip=(dx, dy)       where the hips (and everything above) move, in pixels
      lean, head         torso / head tilt in degrees (+ = forward / down)
      bfoot, ffoot       where each ankle goes, offset from where it is in the drawing; the legs bend to reach
                         (knees forward), and the boots stay level unless btoe / ftoe tilt them
      fa, ff, fh         front upper arm, forearm, hand: the screen direction each points (0 = forward,
                         90 = down, -90 = up, 180 = back); fh defaults to following the forearm
      ba, bf             the back arm, the same way
      anything else      passed straight through as a puppet pose entry (cape=..., flame=..., root=...)"""
    def __init__(self, J, bones, legs):
        self.J, self.aim = J, Aim(bones)
        self.legs = legs              # {'b': ('bthigh', 'bshin', 'bshoe', hip, knee, ankle), 'f': (...)}
        self.len = {s: (math.dist(J[v[3]], J[v[4]]), math.dist(J[v[4]], J[v[5]])) for s, v in legs.items()}
    def __call__(self, hip=(0, 0), lean=0, head=0, bfoot=(0, 0), ffoot=(0, 0), btoe=0, ftoe=0, fa=None, ff=None, fh=None, ba=None, bf=None, squash=(1, 1), spin=0, **extra):
        J = self.J
        pose = {'root': (0, hip[0], hip[1], squash[0], squash[1]), 'torso': (lean, 0, 0), 'head': (head, 0, 0)}
        kw = {}
        for side, foot, toe in (('b', bfoot, btoe), ('f', ffoot, ftoe)):
            th, sh, shoe, hj, kj, aj = self.legs[side]
            l1, l2 = self.len[side]
            ankle = (J[aj][0] + foot[0] - hip[0], J[aj][1] + foot[1] - hip[1])      # in the root's frame
            t, s = leg_ik(J[hj], ankle, l1, l2)
            kw[th] = ('w', t); kw[sh] = ('w', s); kw[shoe] = ('w', toe)
        if fa is not None: kw['fupper'] = ('w', fa)
        if ff is not None: kw['ffore'] = ('w', ff)
        if fh is not None: kw['ffist'] = ('w', fh)
        elif ff is not None: kw['ffist'] = ('w', ff)
        if ba is not None: kw['bupper'] = ('w', ba)
        if bf is not None: kw['bfore'] = ('w', bf)
        for n, v in extra.items():
            if isinstance(v, tuple) and v and v[0] == 'w': kw[n] = v                 # staff=('w', 200): aimed like a limb
            else: pose[n] = (v,) if isinstance(v, (int, float)) else v              # cape=12 means an angle
        pose = self.aim(pose, **kw)
        if spin: r = list(pose['root']); r[0] = spin; pose['root'] = tuple(r)     # a flip turns the whole pose with it
        return pose

def unwrap(keys):
    """Between neighbouring keys, turn every joint the short way round (aimed angles come back in -180..180)."""
    prev = {}
    out = []
    for t, pose, ease in keys:
        p = dict(pose)
        for name, v in pose.items():
            if name.startswith('_') or name == 'root' or not v: continue
            a = v[0]
            if name in prev: a = prev[name] + ((a - prev[name] + 180) % 360 - 180)
            prev[name] = a; p[name] = (a,) + tuple(v[1:])
        out.append((t, p, ease))
    return out
