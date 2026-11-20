"""HANZ / $@L's animations for the LOST room, rendered from the model in hanz_3d.py like a PS1 game: light baked into
the vertices, vertices snapped to the low-res screen (they wobble), the face texture nearest-pixel, 320x180 with no
anti-aliasing, 15-bit colour with the ordered dither (hanz_3d.ps1_post). The game draws it at 2x (SCALE).

Every frame his whole figure is rebuilt from a POSE and rendered through the LOST room's camera:
  body    hips position + lean (rx) + turn (rz)
  head    yaw / pitch / roll about his neck (yaw > 0 turns his face to the picture's right, showing more of $@L's red
          left half; yaw < 0 shows more of HANZ's grey right half)
  l / r   each arm: where the wrist goes (w = in the room, wb with b = 1 = on his body, wh with h = 1 = on his head),
          which way the elbow points (pole), the fingers point (dir) and the back of the hand faces (nrm), each
          finger's curl (index..pinky: 0 straight - 1 a fist; negative lifts it), spread, the thumb (on the inside of
          the hand: 0 along it, 1 across). Elbows come from two-bone IK (UPPER / FORE).
  hatch   how far the hatch in his chest is open; heart = his clock-heart in HANZ's hand, clock = its hands' angles;
  mask    where his face (a mask) is - pulled off, lowered, tipped (mask_local); collar = how far his collar's flares
          are pushed back (so arms can reach his face).
Animations are key poses with timings in seconds (ANIMS) and an ease into each key; his head trails the body (LAG).
The counter and everything on it are holdouts: they cut him out where they're in front of him, so the game draws:
room, counter, the desk things, him.

His PUPILS are not in the face texture: cut out of the drawing (PUPILS), drawn by the game at the spot this script
exports per frame, nudged toward whatever he's watching - so his eyes track what you're about to buy.

Run:  python3 tools/sprites/hanz_anim.py [--only idle,unmask,props,counter,...] [--preview DIR] [--clips]
      -> public/assets/shop/lost/hanz_<anim>[_<k>].png, counter.png, prop_<name>.png, pupils.png, heads.png and
         src/scenes/lostFrames.js (generated: do not edit by hand)
Needs bpy (pip install bpy) and imagequant (pip install imagequant).
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
OUT = os.path.join(ROOT, 'public/assets/shop/lost')
TABLE = os.path.join(ROOT, 'src/scenes/lostFrames.js')
CAM = ((0, -215, 78), (0, 0, 36), 36)            # the LOST room's camera: where it is, what it looks at, its lens (mm)
VW, VH = 640, 360
UPPER, FORE = 27, 29                             # arm bone lengths (upper arm, forearm)
THIGH, SHIN = 31, 30                             # leg bone lengths (he's lanky)
HIP = (8, 1, -6)                                 # his hip joints on his body (x either side)
FEET_DESK = (11, -5, 9.0)                         # his ankles when his feet are up on the desk (x either side)
FEET_DOWN = (9, 46, -58)                         # ...and when they're down, behind the counter
FEET_ARC = 22                                    # how high above the desk his feet swing over its back rail
CLEAR = 23.5                                     # the counter's back edge (y) - his coat stays behind it below the top
FPS = 15                                         # frames are rendered at 15 a second (the game holds each 4 ticks)
HEART_SCALE = 1.7                               # his heart's size in his hand
LAG = 0.5                                        # how fast his head catches up with where it's going each frame (1 = no lag)
SHEET_MAX = 1_800_000                            # a sheet bigger than this (bytes) is split in two
DESK = ['counter', 'bell', 'till', 'watch', 'books', 'lava', 'hourglass', 'hourglass_glass', 'candle']

# the pupils, cut out of Mason's face drawing (pixels of hanz_face.png): $@L's dripping iris under his heavy lid
# (rows 19-32, columns 9-23 inside the eye) and HANZ's dot in the middle of his small eye
PUPILS = {'sal': {'rows': (19, 32), 'cols': (9, 23)}, 'hanz': {'rows': (23, 24), 'cols': (41, 42)}}

# ------------------------------------------------------------------ poses
# finger curls per grip (index, middle, ring, pinky), how far they spread, where the thumb is (0 along, 1 across)
GRIPS = {'flat': ((0.03, 0.03, 0.03, 0.03), 0.25, 0.0), 'open': ((0.14, 0.1, 0.12, 0.18), 0.6, 0.1),
         'fist': ((1, 1, 1, 1), 0.0, 1.0), 'point': ((0, 1, 1, 1), 0.0, 1.0), 'cup': ((0.42, 0.45, 0.48, 0.52), 0.15, 0.45),
         'reach': ((0.2, 0.18, 0.22, 0.3), 0.1, 0.3), 'rub': ((0.08, 0.06, 0.08, 0.1), 0.1, 0.2)}


def arm(w=None, wb=None, pole=(1, 0.2, 0.9), dir=(0, -1, 0), nrm=(0, 0, 1), grip='flat', curl=None, b=0.0, spread=None, thumb=None, wh=None, h=0.0):
    """One arm's part of a pose (see the top of the file). grip picks curls / spread / thumb unless given. The wrist is
    w (in the room), or wb with b = 1 (on his body), or wh with h = 1 (on his head - his hands on his face or mask);
    dir / nrm are in that same space."""
    c, sp, th = GRIPS[grip]
    return {'w': tuple(w or (0, 0, 0)), 'wb': tuple(wb or (0, 0, 0)), 'wh': tuple(wh or (0, 0, 0)), 'b': b, 'h': h,
            'pole': pole, 'dir': dir, 'nrm': nrm,
            'curl': tuple(curl or c), 'spread': sp if spread is None else spread, 'thumb': th if thumb is None else thumb}


L_FLAT = arm((-28, -11, 3.1), pole=(-1, 0.2, 0.9), dir=(0.18, -1, 0))
R_FLAT = arm((28, -11, 3.1), pole=(1, 0.2, 0.9), dir=(-0.18, -1, 0))
BASE = {'body': (0, 42, -4, 38, 0), 'head': (0, 4, -7), 'l': L_FLAT, 'r': R_FLAT, 'hatch': 0.0, 'heart': 0.0, 'clock': (300.0, 60.0),
        'mask': (0.0, 0.0, 0.0, 0.0), 'collar': 0.0, 'feet': 0.0, 'tap': 0.0}


def P(body=None, head=None, l=None, r=None, **kw):
    """A pose: BASE with some parts changed. l / r = an arm(...) or a dict of changes to the flat arm."""
    p = dict(BASE); p.update(kw)
    if body: p['body'] = body
    if head: p['head'] = head
    for k, v in (('l', l), ('r', r)):
        if v is None: continue
        if 'curl' in v and 'spread' in v: p[k] = v
        else: q = dict(BASE[k]); q.update(v); p[k] = q
    if 'body' in BASE and BASE.get('l'):                                          # (each wrist in all three spaces and its
        bm = body_matrix(p); hm = head_matrix(p, bm)                              #  directions in the room's, so a hand going
        bi, hi = bm.inverted(), hm.inverted()                                     #  from the room to his body / face moves straight)
        br, hr = bm.to_3x3().normalized(), hm.to_3x3().normalized()
        for k in ('l', 'r'):
            q = dict(p[k])
            if q.get('h', 0) >= 0.5:
                q['w'] = tuple(hm @ Vector(q['wh'])); q['dir'] = tuple(hr @ Vector(q['dir'])); q['nrm'] = tuple(hr @ Vector(q['nrm']))
            elif q['b'] >= 0.5:
                q['w'] = tuple(bm @ Vector(q['wb'])); q['dir'] = tuple(br @ Vector(q['dir'])); q['nrm'] = tuple(br @ Vector(q['nrm']))
            q['wb'] = tuple(bi @ Vector(q['w'])); q['wh'] = tuple(hi @ Vector(q['w']))
            p[k] = q
    return p


def lerp(a, b, t):
    """Blends two poses (numbers and tuples blend; anything else switches halfway)."""
    if isinstance(a, dict): return {k: lerp(a[k], b[k], t) for k in a}
    if isinstance(a, (tuple, list)): return tuple(lerp(x, y, t) for x, y in zip(a, b))
    if isinstance(a, (int, float)): return a + (b - a) * t
    return a if t < 0.5 else b


def ease(t, kind='io'):
    """How a move gets from one key to the next: io = slow in and out, out = fast then settling, in = speeding up,
    back = overshoots a little and settles back, snap = holds still, then cuts straight to the key."""
    if kind == 'snap': return 0.0
    if kind == 'in': return t * t * t
    if kind == 'out': return 1 - (1 - t) ** 3
    if kind == 'back':
        c = 2.2; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
    return t * t * (3 - 2 * t)


def frames_of(keys, loop=False):
    """Keys [(seconds, pose, ease into it)] -> one pose per frame at FPS. A loop leaves off the last key (= the first)."""
    n = int(round(keys[-1][0] * FPS)) + (0 if loop else 1)
    out = []
    for f in range(n):
        t = f / FPS
        i = max(k for k in range(len(keys)) if keys[k][0] <= t + 1e-9)
        if i == len(keys) - 1: out.append(keys[-1][1]); continue
        (t0, p0, *_), (t1, p1, *e) = keys[i], keys[i + 1]
        out.append(lerp(p0, p1, ease((t - t0) / (t1 - t0), e[0] if e else 'io')))
    return out


def follow(frames, lag=LAG, loop=False):
    """His head trails the rest of him: each frame it moves only part of the way to where the pose puts it (a loop runs
    twice so its first frame already carries the lag). Snapped keys are left alone if lag is 1."""
    if lag >= 1: return frames
    cur = frames[-1]['head'] if loop else frames[0]['head']
    out = []
    for rnd in range(2 if loop else 1):
        out = []
        for p in frames:
            cur = tuple(c + (t - c) * lag for c, t in zip(cur, p['head']))
            q = dict(p); q['head'] = cur; out.append(q)
    return out


def breathe(frames, amt=1.0, period=None):
    """A slow breath over the frames: the chest rises and he leans a hair further in (period in frames, default all)."""
    n = period or len(frames); out = []
    for i, p in enumerate(frames):
        k = math.sin(2 * math.pi * i / n) * amt
        x, y, z, rx, rz = p['body']
        q = dict(p); q['body'] = (x, y, z + 0.6 * k, rx + 1.0 * k, rz); out.append(q)
    return out


# arm poses used by the animations (l = $@L's red arm, picture left; r = HANZ's grey arm)
CHIN = arm((14, -6, 40), pole=(1, -0.6, -1), dir=(-0.3, -0.2, 1), nrm=(0, -1, 0), grip='fist')
POINT = arm((-19, -34, 19), pole=(-1, 0, -0.5), dir=(0.1, -1, 0.15), grip='point')
POINT2 = arm((-16, -40, 16), pole=(-1, 0, -0.5), dir=(0.1, -1, 0.02), grip='point')
FIST_UP = lambda s: arm((s * 22, -14, 33), pole=(s, 0.4, -0.2), dir=(0, -0.2, 1), nrm=(0, -1, 0), grip='fist')
FIST_HI = lambda s: arm((s * 25, -11, 43), pole=(s, 0.6, -0.2), dir=(0, 0.1, 1), nrm=(0, -1, 0), grip='fist')
FIST_DOWN = lambda s: arm((s * 25, -12, 11), pole=(s, 0.5, 0.9), dir=(0, -1, 0), grip='fist')
OPEN_WIDE = lambda s: arm((s * 52, -16, 26), pole=(s, 0.6, -0.6), dir=(s * 0.6, -0.5, 0.6), nrm=(0, -0.4, -1), grip='open')
OPEN_WIDER = lambda s: arm((s * 54, -18, 30), pole=(s, 0.6, -0.6), dir=(s * 0.7, -0.4, 0.7), nrm=(0, -0.4, -1), grip='open', spread=0.8)
LIFT = lambda s: arm((s * 27, -12, 9), pole=(s, 0.3, 0.6), dir=(-s * 0.15, -1, 0.3), grip='open')      # (hands up off the wood first,
RAISE = lambda s: arm((s * 33, -17, 25), pole=(s, 0.5, -0.2), dir=(s * 0.3, -0.7, 0.6), nrm=(0, -0.5, -0.8), grip='open')   #  then up past the desk things)
PALM_UP = lambda s: arm((s * 32, -20, 14), pole=(s, 0.4, -0.3), dir=(s * 0.3, -1, 0.2), nrm=(0, 0, -1), grip='open')
RUB = lambda dx: (arm((-12 + dx, -37, 8), pole=(-1, 0.3, -0.5), dir=(1, -0.3, 0.1), nrm=(0, -1, 0), grip='rub'),
                  arm((12 + dx, -37, 9), pole=(1, 0.3, -0.5), dir=(-1, -0.3, 0.1), nrm=(0, 1, 0), grip='rub'))
HANZ_HEAD = (-26, 14, -6)                         # HANZ forward: face turned to the left, drooping
SAL_HEAD = (26, -4, 8)                            # $@L forward: face turned to the right, chin up


def drum(i, n):
    """HANZ's grey fingers drumming on the counter (frame i of n): pinky to index, each lifting and tapping down in turn,
    twice round the loop, then still."""
    curls = []
    for k in range(4):                            # (index 0 .. pinky 3; the roll runs pinky first)
        ph = (i / n * 2 - (3 - k) * 0.07) % 1.0
        lift = max(0.0, math.sin(ph * math.pi / 0.18)) if ph < 0.18 else 0.0
        curls.append(0.03 - 0.5 * lift)
    return tuple(curls)


def deep_breath(frames, breaths=2, rise=2.4, straighten=3.2, chin=2.5):
    """A slow, clearly visible breath for the idle, `breaths` times over the loop: a long inhale (he rises `rise`,
    straightens `straighten` degrees off his hunch, chin lifts `chin` degrees), a beat held at the top, a quicker
    sinking exhale, a rest at the bottom. The hands stay planted on the counter, so his elbows bend with it."""
    n = len(frames); out = []
    for i, p in enumerate(frames):
        t = (i * breaths / n) % 1.0
        if t < 0.45: k = 0.5 - 0.5 * math.cos(math.pi * t / 0.45)            # in, slow
        elif t < 0.55: k = 1.0                                                # held
        elif t < 0.85: k = 0.5 + 0.5 * math.cos(math.pi * (t - 0.55) / 0.3)  # out, quicker
        else: k = 0.0                                                         # rest
        x, y, z, rx, rz = p['body']; yaw, pitch, roll = p['head']
        q = dict(p); q['body'] = (x, y, z + rise * k, rx - straighten * k, rz)
        q['head'] = (yaw, pitch - chin * k, roll); out.append(q)
    return out


def idle():
    """The idle: too calm. Two slow, deep breaths a loop (his shoulders rise and fall); his head drifts into a crooked
    tilt and back; HANZ's grey fingers drum the counter now and then."""
    n = 90
    fr = frames_of([(0, P()), (2.1, P(head=(3, 6, -11))), (3.9, P(head=(-2, 4, -5))), (6, P())], loop=True)
    out = []
    for i, p in enumerate(fr):
        q = dict(p); r = dict(q['r']); r['curl'] = drum(i, n) if i < n * 0.55 else r['curl']; q['r'] = r; out.append(q)
    return deep_breath(follow(out, loop=True))


def twitch():
    """Something's off: his head snaps over to a horrible crooked angle, hangs there, then cranks back in little jerks."""
    snap = P(body=(0, 42, -4, 39, 3), head=(16, 2, -22))
    keys = [(0, P()), (0.13, snap, 'snap'), (0.8, P(body=(0, 42, -4, 39, 3), head=(17, 3, -23))),
            (0.93, P(head=(12, 3, -18)), 'snap'), (1.13, P(head=(7, 4, -13)), 'snap'), (1.33, P(head=(3, 4, -9)), 'snap'),
            (1.73, P(), 'io')]
    return breathe(frames_of(keys), 0.6)


def heart():
    """The clock-heart (an idle now and then): HANZ's grey hand rises to the hatch in his chest, it swings open (a red
    glow inside), he reaches in and draws out his heart - dark, wet, dripping, a pocket watch wound into it - lifts it
    beside his face, peers at it while its hands spin round and stop, sighs, puts it back and shuts the hatch."""
    lean = (2, 47, 5, 14, -6)                       # sitting up off the counter, turned a little to show the chest
    look = (-4, 9, -8)                               # head down to his chest
    reach = arm(wb=(9.5, -21, 27), b=1, pole=(1, 0, 0.7), dir=(0, 1, 0.1), nrm=(0, 0, 1), grip='reach')
    inside = arm(wb=(9.5, -16.5, 27), b=1, pole=(1, 0, 0.7), dir=(0, 1, 0.1), nrm=(0, 0, 1), grip='cup')
    out_ = arm(wb=(11, -26, 27), b=1, pole=(1, 0, 0.7), dir=(-0.1, 0.6, 0.6), nrm=(0, -0.6, -0.8), grip='cup')
    hold = arm((22, -16, 38), pole=(1, 0.2, -0.6), dir=(-0.3, 0.55, 0.6), nrm=(0, -0.6, -0.5), grip='cup')
    hold2 = arm((23, -18, 40), pole=(1, 0.2, -0.6), dir=(-0.3, 0.55, 0.65), nrm=(0, -0.6, -0.5), grip='cup')
    peer = (18, 4, -14); sigh = (14, 10, -8)
    lift = arm((26, -12, 15), pole=(1, 0.2, 0.6), dir=(-0.2, -1, 0.3), grip='open')        # (the hand comes up off the wood first)
    k = [(0.0, P()),
         (0.25, P(body=(1, 43, -1, 28, -3), head=(-2, 6, -8), r=lift), 'io'),
         (0.6, P(body=lean, head=look, r=reach), 'io'),
         (0.95, P(body=lean, head=look, r=reach, hatch=105), 'back'),
         (1.3, P(body=lean, head=look, r=inside, hatch=105), 'io'),
         (1.45, P(body=lean, head=look, r=inside, hatch=105, heart=1), 'snap'),
         (1.85, P(body=lean, head=(4, 12, -10), r=out_, hatch=105, heart=1), 'out'),
         (2.5, P(body=lean, head=peer, r=hold, hatch=105, heart=1, clock=(300, 60)), 'io'),
         (3.0, P(body=lean, head=(18, 4, -16), r=hold2, hatch=105, heart=1, clock=(300, 60)), 'io'),
         (4.0, P(body=lean, head=(18, 4, -16), r=hold2, hatch=105, heart=1, clock=(330, 60 + 720)), 'out'),
         (4.6, P(body=(2, 47, 4, 16, -6), head=sigh, r=hold, hatch=105, heart=1, clock=(330, 780)), 'io'),
         (5.2, P(body=lean, head=look, r=out_, hatch=105, heart=1, clock=(330, 780)), 'io'),
         (5.55, P(body=lean, head=look, r=inside, hatch=105, heart=1, clock=(330, 780)), 'io'),
         (5.62, P(body=lean, head=look, r=inside, hatch=105, heart=0, clock=(330, 780)), 'snap'),
         (5.95, P(body=lean, head=look, r=reach, hatch=105), 'io'),
         (6.25, P(body=lean, head=look, r=reach, hatch=0), 'in'),
         (6.6, P(body=(1, 43, -1, 28, -3), head=(-2, 6, -8), r=lift), 'io'),
         (7.0, P(), 'io')]
    fr = frames_of(k)
    for p in fr: p['clock'] = (p['clock'][0] % 360, p['clock'][1] % 360)
    return breathe(follow(fr), 0.8)


def look(side):
    """Turning to look along the counter at the cards (side -1 = his left / picture left, +1 = right, 0 = down)."""
    tgt = {-1: P(body=(-6, 42, -4, 40, 9), head=(-15, 10, -4)), 1: P(body=(6, 42, -4, 40, -9), head=(15, 10, -10)),
           0: P(body=(0, 40, -6, 46, 0), head=(0, 22, -5))}[side]
    return follow(frames_of([(0, P()), (0.53, tgt, 'out')]), 0.6)


def mask_local(m):
    """Where his mask (the face plate) is, in his head's own space: m = (forward / back, up / down, tilt, turn) -
    pulled off forward, lowered, tipped about its own middle."""
    dy, dz, rx, rz = m
    return H.T(0, dy, dz) @ H.T(0, -9, 0) @ H.T(rx=rx, rz=rz) @ H.T(0, 9, 0)


def grip_mask(s, m, curl=0.55):
    """A hand gripping the edge of his mask (s = -1 his red hand on the left edge, +1 the grey one on the right), the mask
    at m (mask_local): the fingers curl round onto its front, the thumb behind."""
    M = mask_local(m); R = M.to_3x3()
    return arm(wh=tuple(M @ Vector((s * 26, -13, -2))), h=1, pole=(s * 0.5, -1, -0.5),
               dir=tuple(R @ Vector((-s * 0.9, -0.45, 0.15))), nrm=tuple(R @ Vector((s * 0.4, -0.2, 0.9))), grip='cup',
               curl=(curl,) * 4, thumb=0.2)


def unmask():
    """THE MASK (an idle now and then): both hands come up and take hold of the edges of his face - it's a mask - and
    he pulls it off. Behind it: nothing, black, two pinprick eyes. He lowers it and holds it out toward you, his
    painted face staring at you over the counter while the empty head tilts, considering you; then he lifts it back,
    presses it on with a little shove and straightens it."""
    m0, m_off, m_low = (0, 0, 0, 0), (-15, -3, -6, 0), (-30, -34, 12, 0)
    lift = (LIFT(-1), LIFT(1))
    k = [(0.0, P()),
         (0.4, P(body=(0, 43, -2, 32, 0), head=(0, 2, -6), l=lift[0], r=lift[1]), 'io'),
         (0.95, P(body=(0, 44, 0, 26, 0), head=(0, 0, -4), l=grip_mask(-1, m0, 0.25), r=grip_mask(1, m0, 0.25), collar=1), 'io'),
         (1.25, P(body=(0, 44, 0, 26, 0), head=(0, 0, -4), l=grip_mask(-1, m0), r=grip_mask(1, m0), collar=1), 'out'),
         (1.45, P(body=(0, 44, 0, 26, 0), head=(0, -1, -4), l=grip_mask(-1, (-1.5, 0, 0, 0)), r=grip_mask(1, (-1.5, 0, 0, 0)), mask=(-1.5, 0, 0, 0), collar=1), 'back'),
         (2.15, P(body=(0, 45, 1, 22, 0), head=(0, -6, -2), l=grip_mask(-1, m_off), r=grip_mask(1, m_off), mask=m_off, collar=1), 'out'),
         (2.9, P(body=(0, 44, 0, 28, 0), head=(4, 2, -10), l=grip_mask(-1, m_low), r=grip_mask(1, m_low), mask=m_low), 'io'),
         (3.9, P(body=(0, 44, 0, 28, 0), head=(6, 3, -24), l=grip_mask(-1, m_low), r=grip_mask(1, m_low), mask=m_low), 'io'),
         (4.4, P(body=(0, 44, 0, 28, 0), head=(-4, 1, 4), l=grip_mask(-1, m_low), r=grip_mask(1, m_low), mask=m_low), 'back'),
         (5.0, P(body=(0, 45, 1, 22, 0), head=(0, -4, -2), l=grip_mask(-1, m_off), r=grip_mask(1, m_off), mask=m_off, collar=1), 'io'),
         (5.35, P(body=(0, 44, 0, 26, 0), head=(0, 1, -5), l=grip_mask(-1, m0), r=grip_mask(1, m0), mask=m0, collar=1), 'back'),
         (5.55, P(body=(0, 44, 0, 26, 0), head=(0, 1, -5), l=grip_mask(-1, (0, 0, 0, 4)), r=grip_mask(1, (0, 0, 0, 4)), mask=(0, 0, 0, 4), collar=1), 'io'),
         (5.75, P(body=(0, 44, 0, 26, 0), head=(0, 1, -5), l=grip_mask(-1, m0, 0.25), r=grip_mask(1, m0, 0.25), mask=m0, collar=1), 'back'),
         (6.2, P(body=(0, 43, -2, 32, 0), head=(0, 3, -6), l=lift[0], r=lift[1]), 'io'),
         (6.8, P(), 'io')]
    return breathe(follow(frames_of(k), 0.6), 0.6)


def laugh():
    """$@L CACKLES (when you buy, now and then): a snicker, then he throws his head back and howls, his red fist pounding
    the counter again and again - while HANZ's grey hand comes up and covers his own half of the face."""
    palm = arm(wh=(12, -24, -10), h=1, pole=(0.3, -1, -0.2), dir=(-0.15, 0.1, 1), nrm=(0.1, -1, 0), grip='open', spread=0.5)
    up, dn = FIST_UP(-1), FIST_DOWN(-1)
    k = [(0.0, P()),
         (0.3, P(body=(0, 42, -4, 41, 4), head=(18, 8, 4), l=up), 'io'),
         (0.55, P(body=(0, 44, -1, 30, 2), head=(24, -20, 10), l=dn, r=palm, collar=1), 'out')]
    t = 0.55
    for i in range(6):                                                            # (the howl: shaking, pounding)
        t += 0.2
        k.append((t, P(body=(0, 44, -1 + (0.9 if i % 2 else -0.6), 30 + (-1.5 if i % 2 else 1), 2),
                        head=(24 + (2 if i % 2 else -2), -22 + (3 if i % 2 else -2), 10), l=up if i % 2 == 0 else dn, r=palm, collar=1),
                  'out' if i % 2 else 'in'))
    k += [(t + 0.35, P(body=(0, 43, -2, 34, 2), head=(16, -6, 6), l=LIFT(-1), r=palm, collar=1), 'io'), (t + 0.85, P(), 'io')]
    return follow(frames_of(k), 0.7)


def feet_up():
    """FEET UP (a fidget when he's left alone): pushes off the counter, leans way back in his chair and swings both feet
    up onto the desk - soles to you, one red shoe, one grey - lacing his hands behind his head. He lolls there a
    while (HANZ's foot taps, his head rolls lazily, he breathes), then swings them down and leans back in."""
    nape = lambda s: arm(wh=(s * 12, 15, 15), h=1, pole=(s, 0.4, 0.4), dir=(-s, 0.2, 0.1), nrm=(0, -1, 0), grip='flat')
    back = (0, 50, 7, -9, 0)
    k = [(0.0, P()),
         (0.45, P(body=(0, 45, -2, 26, 0), head=(0, -2, 0), l=LIFT(-1), r=LIFT(1)), 'io'),
         (1.05, P(body=(0, 49, 0, -2, 0), head=(0, -8, 3), l=RAISE(-1), r=RAISE(1), feet=0.55, collar=1), 'io'),
         (1.5, P(body=back, head=(0, -6, 5), l=nape(-1), r=nape(1), feet=1.0, collar=1), 'out'),
         (1.75, P(body=back, head=(2, -5, 6), l=nape(-1), r=nape(1), feet=1.0, collar=1), 'io')]
    t = 1.75
    for i, (hd, tap) in enumerate((((6, -4, 9), 1), ((6, -4, 9), 0), ((6, -4, 9), 1), ((0, -7, 2), 0), ((-7, -3, -5), 1),
                                   ((-7, -3, -5), 0), ((-7, -3, -5), 1), ((-2, -5, 3), 0))):
        t += 0.45 if tap else 0.3
        k.append((t, P(body=back, head=hd, l=nape(-1), r=nape(1), feet=1.0, tap=tap, collar=1), 'out' if tap else 'in'))
    k += [(t + 0.5, P(body=back, head=(0, -4, 2), l=nape(-1), r=nape(1), feet=1.0, collar=1), 'io'),
          (t + 1.05, P(body=(0, 49, 0, -2, 0), head=(0, -2, 0), l=RAISE(-1), r=RAISE(1), feet=0.5, collar=1), 'io'),
          (t + 1.55, P(body=(0, 45, -2, 26, 0), head=(0, 2, -2), l=LIFT(-1), r=LIFT(1), feet=0.0), 'in'),
          (t + 2.05, P(), 'back')]
    return breathe(follow(frames_of(k), 0.6), 0.8)


ANIMS = {
    'idle': {'loop': True, 'frames': idle},
    'unmask': {'frames': unmask, 'lazy': True},
    'laugh': {'frames': laugh, 'lazy': True},
    'feet': {'frames': feet_up, 'lazy': True},
    'twitch': {'frames': twitch, 'lazy': True},
    'heart': {'frames': heart, 'lazy': True},
    'look_l': {'frames': lambda: look(-1)},
    'look_r': {'frames': lambda: look(1)},
    'look_d': {'frames': lambda: look(0)},
    # HANZ talking: turns his grey side to you, slumps, props his chin on his grey fist, sighs and nods slowly
    'hanz_talk': {'loop': True, 'frames': lambda: breathe(follow(frames_of([
        (0, P(body=(4, 44, -6, 36, -6), head=HANZ_HEAD, r=CHIN)),
        (0.8, P(body=(4, 44, -7, 35, -7), head=(-24, 19, -9), r=dict(CHIN, w=(14, -6, 38)))),
        (1.4, P(body=(4, 44, -6.5, 35.5, -6), head=(-27, 12, -4), r=dict(CHIN, w=(14, -6, 39.2)))),
        (2.4, P(body=(4, 44, -6, 36, -6), head=HANZ_HEAD, r=CHIN))], loop=True), loop=True), 1.6)},
    # $@L talking: turns his red side to you, leans right in and jabs a red finger at you, the jabs overshooting
    'sal_talk': {'loop': True, 'frames': lambda: follow(frames_of([
        (0, P(body=(-4, 40, -3, 44, 7), head=SAL_HEAD, l=POINT)),
        (0.27, P(body=(-4, 39, -3, 47, 8), head=(30, -7, 11), l=POINT2), 'back'),
        (0.6, P(body=(-4, 40, -3, 44, 7), head=SAL_HEAD, l=POINT)),
        (0.87, P(body=(-4, 39, -3, 46, 8), head=(23, -1, 5), l=POINT2), 'back'),
        (1.6, P(body=(-4, 40, -3, 44, 7), head=SAL_HEAD, l=POINT))], loop=True), 0.7, loop=True)},
    # arguing with himself: the head snaps from side to side with no in-between, the fists come down
    'argue': {'loop': True, 'frames': lambda: frames_of([
        (0, P(body=(3, 43, -5, 36, -5), head=(-28, 12, -6), r=FIST_UP(1))),
        (0.33, P(body=(3, 42, -5.5, 38, -5), head=(-26, 10, -5), r=FIST_DOWN(1)), 'in'),
        (0.4, P(body=(-3, 40, -3, 44, 6), head=(28, -4, 5), l=FIST_UP(-1)), 'snap'),
        (0.73, P(body=(-3, 39.5, -3.5, 46, 6), head=(26, -2, 4), l=FIST_DOWN(-1)), 'in'),
        (0.8, P(body=(3, 43, -5, 36, -5), head=(-28, 12, -6), r=FIST_UP(1)), 'snap')], loop=True)},
    # $@L loses it: rears back with both fists high (anticipation), then brings them down on the counter - the whole
    # body drops into it, bounces, and settles
    'slam': {'frames': lambda: follow(frames_of([
        (0, P()), (0.35, P(body=(0, 45, 1, 24, 0), head=(18, -14, 6), l=FIST_HI(-1), r=FIST_HI(1)), 'out'),
        (0.47, P(body=(0, 45, 1.5, 22, 0), head=(20, -16, 6), l=FIST_HI(-1), r=FIST_HI(1))),
        (0.6, P(body=(0, 40, -6, 45, 0), head=(20, 10, 4), l=FIST_DOWN(-1), r=FIST_DOWN(1)), 'in'),
        (0.75, P(body=(0, 41, -5, 43, 0), head=(18, 4, 2), l=FIST_DOWN(-1), r=FIST_DOWN(1)), 'out'),
        (1.2, P(body=(0, 41, -5.5, 44, 0), head=(16, 6, 0), l=FIST_DOWN(-1), r=FIST_DOWN(1)))]), 0.65)},
    # welcome: dips, then rises off the counter and throws his arms wide, palms open, head tipped - and sinks back
    'greet': {'frames': lambda: breathe(follow(frames_of([
        (0, P()), (0.25, P(body=(0, 41, -6, 42, 0), head=(0, 10, -4), l=LIFT(-1), r=LIFT(1)), 'io'),
        (0.5, P(body=(0, 43, -2, 30, 0), head=(0, 0, -10), l=RAISE(-1), r=RAISE(1)), 'io'),
        (0.85, P(body=(0, 44, 1, 20, 0), head=(0, -8, -16), l=OPEN_WIDER(-1), r=OPEN_WIDER(1)), 'back'),
        (1.4, P(body=(0, 44, 1.5, 19, 0), head=(5, -9, -18), l=OPEN_WIDE(-1), r=OPEN_WIDE(1))),
        (2.0, P(), 'io')])), 0.6)},
    # sold! $@L rubs his hands together, leaning in, head bobbing with it
    'sold': {'loop': True, 'frames': lambda: follow(frames_of([
        (0, P(body=(0, 41, -3, 42, 0), head=(14, 0, 6), l=RUB(0)[0], r=RUB(0)[1])),
        (0.4, P(body=(0, 41, -3.4, 43, 0), head=(17, -3, 9), l=RUB(1)[0], r=RUB(-1)[1])),   # (the hands only slide in a little: further, the sleeves meet the collar)
        (0.8, P(body=(0, 41, -3, 42, 0), head=(14, 0, 6), l=RUB(0)[0], r=RUB(0)[1])),
        (1.2, P(body=(0, 41, -3.4, 43, 0), head=(11, 3, 3), l=RUB(-3)[0], r=RUB(3)[1])),
        (1.6, P(body=(0, 41, -3, 42, 0), head=(14, 0, 6), l=RUB(0)[0], r=RUB(0)[1]))], loop=True), 0.7, loop=True)},
    # HANZ's sad shrug: shoulders up with a little bounce, palms up, head drops - then it all sags back
    'shrug': {'frames': lambda: follow(frames_of([
        (0, P()), (0.45, P(body=(0, 44, 2.5, 29, 0), head=(-12, 16, -5), l=PALM_UP(-1), r=PALM_UP(1)), 'back'),
        (1.0, P(body=(0, 44, 2, 30, 0), head=(-13, 18, -7), l=PALM_UP(-1), r=PALM_UP(1))),
        (1.6, P(), 'io')]), 0.6)},
}

# ------------------------------------------------------------------ building him from a pose
NO_CLIP = H.NO_CLIP + [(a, b) for a in ('hand_sal', 'hand_hanz', 'sleeve_sal', 'sleeve_hanz')
                       for b in ('books', 'lava', 'hourglass', 'hourglass_glass', 'candle', 'bell', 'till', 'watch')
                       if (a, b) not in H.NO_CLIP] + [(a, b) for a in ('leg_sal', 'leg_hanz') for b in ('books', 'lava', 'bell', 'watch', 'candle', 'till')] + [('heart', 'face'), ('heart', 'hair'), ('heart', 'collar_r'), ('heart', 'counter')]


def ik(S, W, pole, upper=UPPER, fore=FORE):
    """Two-bone IK: the elbow for a shoulder S and wrist W (bones upper, fore - the arm's by default, or the leg's),
    bent toward pole. Returns (elbow, wrist) - the wrist pulled in if it was out of reach."""
    S, W, pole = np.array(S, float), np.array(W, float), np.array(pole, float)
    d = W - S; L = np.linalg.norm(d); n = d / L
    L = min(L, upper + fore - 0.5); W = S + n * L
    x = (upper ** 2 - fore ** 2 + L ** 2) / (2 * L); h = math.sqrt(max(upper ** 2 - x ** 2, 0))
    p = pole - np.dot(pole, n) * n; p /= np.linalg.norm(p)
    return tuple(S + n * x + p * h), tuple(W)


def bend(d, nrm, ang):
    """Turns direction d (and its normal nrm) toward the palm by ang radians: one finger joint curling."""
    c, s_ = math.cos(ang), math.sin(ang)
    return d * c - nrm * s_, nrm * c + d * s_


def hand(s, w, d, nrm, curl, spread, thumb):
    """A long-fingered hand at wrist w: fingers along d, the back of the hand facing nrm. curl = each finger's curl
    (index..pinky: 0 straight, 1 a tight fist, negative lifted), spread = how far they fan out, thumb = 0 along the
    hand, 1 tucked across the fingers. Round segments with knuckles, smooth-shaded. Returns (Mesh, palm middle, palm up)."""
    m = H.Mesh()
    skin, skin_d = (H.SAL_SKIN, H.SAL_SKIN_D) if s < 0 else (H.HANZ_SKIN, H.HANZ_SKIN_D)
    w, d, nrm = np.array(w, float), np.array(d, float), np.array(nrm, float)
    d /= np.linalg.norm(d); nrm = nrm - np.dot(nrm, d) * d; nrm /= np.linalg.norm(nrm)
    u = np.cross(d, nrm)
    plen = 12 - 2.5 * float(np.mean(np.clip(curl, 0, 1)))
    end = w + d * plen
    ring = lambda c, r1, r2: [tuple(c + u * r1 * math.cos(a) + nrm * r2 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 11)[:-1]]
    m.hull(ring(w, 4.6, 1.8) + ring(w + d * plen * 0.55, 6.0, 2.0) + ring(end, 5.6, 1.6), skin)        # the palm
    knuck = lambda c, r: [tuple(c + r * np.array((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))))
                          for a in np.linspace(0, 2 * math.pi, 7)[:-1] for e in (-0.9, 0, 0.9)]
    for i in range(4):                                                            # index (by the thumb) .. pinky
        a = s * (4.4 - 2.95 * i)
        p = end + u * a - nrm * 0.2
        fd = d + u * (a / 4.4) * spread * 0.35; fd /= np.linalg.norm(fd); fn = nrm.copy()
        segs = (4.8, 3.8, 3.0) if i in (1, 2) else (4.3, 3.4, 2.7) if i == 0 else (3.7, 2.9, 2.4)
        r = 1.55 if i < 3 else 1.35
        for j, (ln, ang) in enumerate(zip(segs, (1.35, 1.55, 1.0))):
            fd, fn = bend(fd, fn, ang * curl[i])
            q = p + fd * ln
            m.limb(tuple(p), tuple(q), r, r * 0.9, skin, sides=8)
            m.hull(knuck(p, r * 1.02), skin)
            p = q; r *= 0.9
        m.hull(knuck(p, r * 0.95), skin)                                          # the fingertip
    # the thumb: from the heel of the hand, along the side (0) or folded across the fingers (1)
    tb = w + d * 3 + u * (s * 4.4) - nrm * (0.1 + 0.5 * thumb)                  # (the thumb on the inside of the hand)
    td = d * (0.75 - 0.6 * thumb) + u * s * (0.65 - 1.35 * thumb) - nrm * (0.85 * thumb); td /= np.linalg.norm(td)
    q1 = tb + td * 5.2; td2 = td + d * 0.4 * thumb - nrm * 0.3 * thumb; td2 /= np.linalg.norm(td2); q2 = q1 + td2 * 4.0
    m.limb(tuple(tb), tuple(q1), 2.0, 1.7, skin_d, sides=8); m.hull(knuck(q1, 1.75), skin_d)
    m.limb(tuple(q1), tuple(q2), 1.7, 1.4, skin_d, sides=8); m.hull(knuck(q2, 1.4), skin_d)
    m.limb(tuple(w - d * 4 + nrm * 0.6), tuple(w + nrm * 0.6), 2.6, 2.6, skin_d, sides=8)   # the wrist out of the cuff
    return m, w + d * plen * 0.6, -nrm


def sleeve(s, S, E, W, body):
    """A trench-coat sleeve from shoulder S through elbow E, flaring to a strapped cuff short of the wrist W. The
    sloped shoulder pad is built in the body's own space (body = its matrix), so it leans with him."""
    m = H.Mesh()
    x, y, z = s * 24, 0, 41
    m.hull([(x - s * 4, y - 8, z + 4), (x - s * 4, y + 8, z + 4), (x + s * 8, y - 8, z - 3), (x + s * 8, y + 8, z - 3),
            (x - s * 4, y - 7, z - 6), (x - s * 4, y + 7, z - 6), (x + s * 7, y - 7, z - 9), (x + s * 7, y + 7, z - 9)], H.COAT, body)
    m.limb(S, E, 7, 6.5, H.COAT, sides=7, twist=0.4)
    m.hull([tuple(np.array(E) + 6.8 * np.array((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))))
            for a in np.linspace(0, 2 * math.pi, 8)[:-1] for e in (-0.8, 0, 0.8)], H.COAT)   # the elbow, rounded
    e, w = np.array(E, float), np.array(W, float)
    cuff = e + (w - e) * 0.84
    m.limb(E, tuple(cuff), 6.5, 8, H.COAT2, sides=7, twist=0.2)
    m.limb(tuple(e + (w - e) * 0.68), tuple(e + (w - e) * 0.76), 8.0, 8.2, H.BELT, sides=7, twist=0.2)
    return m


def body_matrix(pose, back=0.0):
    """His body's matrix for a pose: hips placed, turned, leaning - then slid back (back, and as far as needed) so
    everything below the counter top stays behind its back edge (CLEAR)."""
    x, y, z, rx, rz = pose['body']
    body = H.T(x, y + back, z, rx=0, rz=rz) @ H.T(rx=rx)
    low = [body @ Vector(v) for v in H.coat(Matrix.Identity(4))['torso'].v]
    need = max([CLEAR - p.y for p in low if p.z < 1.5] + [0])
    if need > 0: body = H.T(0, need, 0) @ body
    return body


def head_matrix(pose, body):
    """His head's world matrix for a pose, on top of the body's (body = body_matrix)."""
    neck_top = body @ Vector((0, 1, 50))
    yaw, pitch, roll = pose['head']
    return H.T(*neck_top) @ H.T(rz=yaw) @ H.T(rx=pitch) @ H.T(ry=roll) @ H.T(0, -4, 17) @ Matrix.Scale(H.HEAD_SCALE, 4)


def figure(pose, back=0.0):
    """All of him in a pose: {name: (Mesh, world matrix or None)}, the MASK's world matrix (his face - where the pupils
    go), and where his heart's bottom is (for blood drops) or None."""
    body = body_matrix(pose, back)
    head_M = head_matrix(pose, body)
    mask_M = head_M @ mask_local(pose.get('mask', (0, 0, 0, 0)))
    out = {nm: (m, None) for nm, m in H.coat(body, pose.get('hatch', 0), pose.get('collar', 0)).items()}
    for nm, m in H.head().items(): out[nm] = (m, mask_M if nm == 'face' else head_M)
    bot = None
    for s, key, tag in ((-1, 'l', 'sal'), (1, 'r', 'hanz')):
        a = pose[key]
        S = tuple(body @ Vector((s * 24, 0, 41)))
        b, h = a['b'], a.get('h', 0)
        Wt = np.array(a['w']) * (1 - b - h) + np.array(body @ Vector(a['wb'])) * b + np.array(head_M @ Vector(a['wh'])) * h
        E, W = ik(S, tuple(Wt), a['pole'])
        out['sleeve_' + tag] = (sleeve(s, S, E, W, body), None)
        hm, palm, up = hand(s, W, np.array(a['dir'], float), np.array(a['nrm'], float), a['curl'], a['spread'], a['thumb'])
        out['hand_' + tag] = (hm, None)
        if tag == 'hanz' and pose.get('heart', 0) > 0.5:                         # his heart, cupped in HANZ's palm
            c = palm + up * 5.6 * HEART_SCALE
            fwd = np.array(CAM[0]) - c; fwd[2] = 0; fwd /= np.linalg.norm(fwd)     # (its clock turned toward you)
            zz = np.array((0, 0, 1.0)); xx = np.cross(-fwd, zz); xx /= np.linalg.norm(xx); yy = -fwd
            M = Matrix(((xx[0], yy[0], 0, c[0]), (xx[1], yy[1], 0, c[1]), (xx[2], yy[2], 1, c[2]), (0, 0, 0, 1))) @ Matrix.Scale(HEART_SCALE, 4)
            t = pose.get('_t', 0)
            drips = [(-2.6, -0.8, 1.2 + 0.5 * math.sin(t * 2.1)), (0.6, -5.6, 1.5 + 0.8 * abs(math.sin(t * 1.3))), (2.9, -0.4, 0.8 + 0.4 * math.sin(t * 3.0 + 1))]
            out['heart'] = (H.heart(pose.get('clock', (0, 0)), drips), M)
            bot = M @ Vector((0.6, -0.1, -6.8))
    if pose.get('feet', 0) > 0.01: out.update(legs(pose, body))
    return out, mask_M, bot


def legs(pose, body):
    """His legs, only built while they show (pose 'feet' > 0): 0 = down behind the counter, 1 = both feet up on the
    desk, soles to you, ankles at FEET_DESK; in between they swing up in an arc (FEET_ARC) over the back rail. 'tap' =
    HANZ's grey foot tapping (its toe tips toward you). Returns {'leg_sal': ..., 'leg_hanz': ...}."""
    f = pose['feet']; out = {}
    for s, tag in ((-1, 'sal'), (1, 'hanz')):
        hip = np.array(body @ Vector((s * HIP[0], HIP[1], HIP[2])))
        lo = np.array((s * FEET_DOWN[0], FEET_DOWN[1], FEET_DOWN[2])); hi = np.array((s * FEET_DESK[0], FEET_DESK[1], FEET_DESK[2]))
        if f < 0.5:                                                                # up behind the counter...
            g = f / 0.5; a = lo + np.array((0, 0, (hi[2] + FEET_ARC - lo[2]) * g))
        else:                                                                      # ...then over the rail and down onto it
            g = (f - 0.5) / 0.5; a = np.array((lo[0] + (hi[0] - lo[0]) * g, lo[1] + (hi[1] - lo[1]) * g, hi[2] + FEET_ARC * math.cos(g * math.pi / 2)))
        knee, ankle = ik(hip, a, (s * 0.15, -0.25, 1), THIGH, SHIN)
        tap = pose.get('tap', 0) if s > 0 else 0
        toe = np.array((s * 0.12, -0.25 - 0.6 * tap, 1.0)) * f + np.array((0, -1, -0.2)) * (1 - f)
        up = np.array((0, 1, 0.25 - 0.6 * tap)) * f + np.array((0, -0.2, 1)) * (1 - f)
        out['leg_' + tag] = (H.leg(s, tuple(hip), tuple(knee), tuple(ankle), tuple(toe), tuple(up)), None)
    return out


COLLAR_STEPS = (0.0, 0.25, 0.5, 0.75, 1.0)       # how far the collar may slump, tried in turn (collar = 0..1)
COLLAR_EASE = 3                                  # frames either side a slump is held and eased over (so it never pops)


def settle_collar(poses, mats, loop=False):
    """His ring collar gives way to whatever presses into it: for each frame, the least slump (pose 'collar', see
    hanz_3d.coat) that keeps his head, hair and sleeves out of it; then held COLLAR_EASE frames either side and
    smoothed, so it folds down and stands back up gently. Returns new poses (never less slumped than they asked)."""
    need = []
    for pose in poses:
        best, back = 1.0, None
        for c in COLLAR_STEPS:
            if c < pose.get('collar', 0): continue
            q = dict(pose); q['collar'] = c
            if back is None:                                                       # (how far back he stands doesn't depend on the collar)
                for back in np.arange(0, 30, 0.75):
                    parts, mm, bot = figure(q, back); place(parts, mats)
                    clips = clip_check()
                    if not any(x[:2] == ('torso', 'counter') for x in clips): break
            else:
                parts, mm, bot = figure(q, back); place(parts, mats); clips = clip_check()
            if not any('collar' in x[0] or 'collar' in x[1] for x in clips): best = c; break
        need.append(best)
    n = len(need); E = COLLAR_EASE
    at = lambda i: need[i % n] if loop else need[min(max(i, 0), n - 1)]
    held = [max(at(j) for j in range(i - E, i + E + 1)) for i in range(n)]
    hat = lambda i: held[i % n] if loop else held[min(max(i, 0), n - 1)]
    out = []
    for i, pose in enumerate(poses):
        q = dict(pose); q['collar'] = max(pose.get('collar', 0), need[i], sum(hat(j) for j in range(i - E, i + E + 1)) / (2 * E + 1))
        out.append(q)
    return out


# ------------------------------------------------------------------ rendering (PS1 style)
SCALE = VW // H.RES[0]                           # the renders are drawn at this size in the game (2: 320x180 -> 640x360)


def setup():
    """The scene: the PS1 materials, the counter and the desk things (built once, lit, snapped), the camera.
    Returns (camera, mats)."""
    H.build('lean')                                                               # (render settings, materials, counter)
    mats = H.build.mats
    for ob in list(bpy.data.objects):
        if ob.type == 'MESH' and ob.name not in ('counter', 'bell', 'till', 'watch'): bpy.data.objects.remove(ob)
    # the face material with the pupils cut out of the drawing (the game draws them, so they can move)
    src = np.array(Image.open(H.FACE).convert('RGBA'))
    for p in PUPILS.values():
        (r0, r1), (c0, c1) = p['rows'], p['cols']; src[r0:r1 + 1, c0:c1 + 1, 3] = 0
    tex = next(n for n in mats['face'].node_tree.nodes if n.type == 'TEX_IMAGE'); tex.image = H.face_image(src)
    cam = bpy.data.objects['cam']
    loc, tgt, lens = CAM
    cam.location = loc; cam.data.lens = lens
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    for nm, m in H.props().items():
        ob = H.to_object(nm, m, mats); ob['desk'] = 1
    for nm in DESK: H.light_up(bpy.data.objects[nm], cam, snap=True)
    sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y = H.RES; sc.render.resolution_percentage = 100
    return cam, mats


def desk_hits(cam, pad=3):
    """Where each thing on his desk is on the game's 640x360 screen (x, y, w, h, padded a little) - LostScene lets you
    click them (THE DESK). The hourglass is its frame and glass together."""
    groups = {'bell': ['bell'], 'watch': ['watch'], 'till': ['till'], 'books': ['books'], 'lava': ['lava'],
              'hourglass': ['hourglass', 'hourglass_glass'], 'candle': ['candle']}
    out = {}
    for name, obs in groups.items():
        xs, ys = [], []
        for nm in obs:
            ob = bpy.data.objects.get(nm)
            if not ob: continue
            for v in ob.data.vertices:
                x, y = to_screen(cam, ob.matrix_world @ v.co); xs.append(x); ys.append(y)
        if xs: out[name] = [round(min(xs)) - pad, round(min(ys)) - pad, round(max(xs) - min(xs)) + 2 * pad, round(max(ys) - min(ys)) + 2 * pad]
    return out


def desk(mode):
    """How the counter and the desk things take part in a render: 'cut' = holdouts (they cut him out where they're in
    front of him), 'show' = rendered as themselves, 'hide' = left out."""
    for nm in DESK:
        ob = bpy.data.objects.get(nm)
        if not ob: continue
        ob.hide_render = mode == 'hide'; ob.is_holdout = mode == 'cut'


def to_screen(cam, p):
    """A world point -> pixel on the game's 640x360 view."""
    v = world_to_camera_view(bpy.context.scene, cam, Vector(p))
    return v.x * VW, (1 - v.y) * VH


def border(cam, obs, pad=(10, 10, 10, 10)):
    """Renders only the box round these objects (plus pad px of the 640x360 view each side)."""
    xs, ys = [], []
    for ob in obs:
        for c in ob.bound_box:
            x, y = to_screen(cam, ob.matrix_world @ Vector(c)); xs.append(x); ys.append(y)
    sc = bpy.context.scene
    x0, x1 = max(0, min(xs) - pad[0]), min(VW, max(xs) + pad[2]); y0, y1 = max(0, min(ys) - pad[1]), min(VH, max(ys) + pad[3])
    sc.render.use_border = True; sc.render.use_crop_to_border = False
    sc.render.border_min_x = x0 / VW; sc.render.border_max_x = x1 / VW
    sc.render.border_min_y = 1 - y1 / VH; sc.render.border_max_y = 1 - y0 / VH


def shoot(path):
    """Renders the view to path (320x180) and returns it through the PS1 colour (H.ps1_post): an RGBA array."""
    sc = bpy.context.scene; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return H.ps1_post(np.array(Image.open(path).convert('RGBA')))


def place(parts, mats, cam=None):
    """Puts his parts in the scene (tagged 'hanz', replacing the last frame's), lit and snapped (if cam)."""
    for ob in list(bpy.data.objects):
        if ob.get('hanz'): bpy.data.objects.remove(ob)
    obs = []
    for nm, (m, M) in parts.items():
        ob = H.to_object(nm, m, mats, face_box=H.FACE_UV if nm == 'face' else None)
        ob['hanz'] = 1
        if M is not None: ob.matrix_world = M
        obs.append(ob)
    if cam:
        bpy.context.view_layer.update()
        for ob in obs: H.light_up(ob, cam, snap=True)
    return obs


def clip_check():
    """Every NO_CLIP pair passing through each other this frame (the desk included)."""
    old = H.NO_CLIP; H.NO_CLIP = NO_CLIP
    try: return H.clip_check()
    finally: H.NO_CLIP = old


def render_pose(cam, mats, pose, path, drops=()):
    """Builds him in a pose (standing back as far as he must to clear the counter) plus any falling blood drops, checks
    nothing passes through anything (before the PS1 snap, which wobbles things by design), renders him through the
    room camera with the desk cutting him out, and returns (RGBA 320x180, the mask's matrix, the heart's bottom, clips)."""
    for back in np.arange(0, 30, 0.75):
        parts, mask_M, bot = figure(pose, back)
        for i, p in enumerate(drops): parts['drop%d' % i] = (H.drop(p), None)
        obs = place(parts, mats)
        clips = clip_check()
        if not any(c[:2] == ('torso', 'counter') for c in clips): break
    obs = place(parts, mats, cam)
    desk('cut'); border(cam, obs)
    img = clean(shoot(path))
    return sharp_face(img, obs, path), mask_M, bot, clips


FACE_SS = 2                                      # the face is rendered this many times finer, then folded back down
FACE_INK = 70                                    # a face pixel this dark (brightest channel) is one of his drawn lines


def sharp_face(img, obs, path):
    """Makes his face read clearly. At 320x180 the 64x64 drawing lands on ~34 pixels, so nearest sampling skipped half
    its lines. The face alone is rendered FACE_SS times finer (everything else a holdout, so his hands still cover it),
    then folded back to the 320 grid keeping the lines: a pixel is ink if any of its sub-pixels is, else the skin's
    average, in 15-bit colour without the dither (the dither smeared his thin lines). Same wobbly geometry, so the
    face stays put on the head. Returns the frame with its face pixels replaced."""
    faces = [ob for ob in obs if ob.name.startswith('face')]
    if not faces: return img
    sc = bpy.context.scene
    for ob in obs: ob.is_holdout = ob not in faces
    sc.render.resolution_percentage = 100 * FACE_SS
    try:
        sc.render.filepath = path; bpy.ops.render.render(write_still=True)
        hi = np.array(Image.open(path).convert('RGBA')).astype(float)
    finally:
        sc.render.resolution_percentage = 100
        for ob in obs: ob.is_holdout = False
    h, w = img.shape[:2]; s = FACE_SS
    blk = hi[:h * s, :w * s].reshape(h, s, w, s, 4).transpose(0, 2, 1, 3, 4).reshape(h, w, s * s, 4)
    a = blk[..., 3] > 127
    cover = a.mean(axis=2)
    ink = a & (blk[..., :3].max(axis=3) < FACE_INK)
    n_ink = ink.sum(axis=2); n_skin = (a & ~ink).sum(axis=2)
    inkc = (blk[..., :3] * ink[..., None]).sum(axis=2) / np.maximum(n_ink, 1)[..., None]
    skin = (blk[..., :3] * (a & ~ink)[..., None]).sum(axis=2) / np.maximum(n_skin, 1)[..., None]
    rgb = np.where((n_ink > 0)[..., None], inkc, skin)
    rgb = np.clip(np.floor(rgb / 8) * 8 + 4, 0, 255)
    out = img.copy(); m = cover >= 0.5
    out[m, :3] = rgb[m].astype(np.uint8); out[m, 3] = 255
    return out


def clean(img):
    """Drops stray specks off him (the holdout's odd lone pixel)."""
    from scipy.ndimage import label
    lab, n = label(img[..., 3] > 0)
    if n > 1:
        sizes = np.bincount(lab.ravel()); sizes[0] = 0
        img = img.copy(); img[(lab > 0) & (sizes[lab] < 12)] = 0
    return img


def trim(img):
    """Crops to what's drawn; returns (crop, x, y) - x, y in the render's own pixels."""
    ys, xs = np.nonzero(img[..., 3])
    if not len(xs): return img[:1, :1], 0, 0
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(), int(xs.min()), int(ys.min())


def quantize(arr, colours=256):
    """An RGBA picture -> a palette PNG image (no dithering of its own: the PS1 dither is already in it)."""
    import imagequant
    return imagequant.quantize_pil_image(Image.fromarray(arr), dithering_level=0.0, max_colors=colours, min_quality=0, max_quality=100)


def pack(crops, name, info):
    """Packs an animation's frames into sheets (rows wrapping at 4096 px, a new sheet past SHEET_MAX bytes or 2048 px
    tall), quantized; fills each frame's sheet index / place into info. Returns the sheet file names."""
    def build(cs):
        hmax = max(c.shape[0] for c in cs); rows, row, rw = [], [], 0
        for c in cs:
            if rw + c.shape[1] > 4096 and row: rows.append(row); row, rw = [], 0
            row.append(c); rw += c.shape[1] + 1
        rows.append(row)
        W = max(sum(c.shape[1] + 1 for c in r) for r in rows); Hh = (hmax + 1) * len(rows)
        sheet = np.zeros((Hh, W, 4), np.uint8); places = []
        for ri, r in enumerate(rows):
            xx = 0
            for c in r:
                sheet[ri * (hmax + 1):ri * (hmax + 1) + c.shape[0], xx:xx + c.shape[1]] = c
                places.append((xx, ri * (hmax + 1), c.shape[1], c.shape[0])); xx += c.shape[1] + 1
        return sheet, places
    groups, start = [], 0
    while start < len(crops):                                                     # as many frames as fit a sheet
        n = len(crops) - start
        while True:
            sheet, places = build(crops[start:start + n])
            path = os.path.join(OUT, '_try.png'); quantize(sheet).save(path, optimize=True)
            if (os.path.getsize(path) <= SHEET_MAX and sheet.shape[0] <= 2048) or n == 1: break
            n = max(1, n // 2) if n > 8 else n - 1
        groups.append((start, n, sheet, places)); start += n
    os.remove(os.path.join(OUT, '_try.png'))
    files = []
    for k, (start, n, sheet, places) in enumerate(groups):
        fn = f'hanz_{name}.png' if len(groups) == 1 else f'hanz_{name}_{k}.png'
        quantize(sheet).save(os.path.join(OUT, fn), optimize=True); files.append(fn)
        for j, (sx, sy, w, h) in enumerate(places): info[start + j].update({'k': k, 'sx': sx, 'sy': sy, 'w': w, 'h': h})
    for old in os.listdir(OUT):                                                   # (drop sheets left over from a longer run)
        if old.startswith(f'hanz_{name}') and old.endswith('.png') and old not in files and (old == f'hanz_{name}.png' or old[len(f'hanz_{name}_'):-4].isdigit()):
            os.remove(os.path.join(OUT, old))
    return files


# ------------------------------------------------------------------ the pupils
def pupil_sheet():
    """The two pupils, as the drawing's own pixels (one per texel - chunky, like the face): pupils.png = $@L's iris
    then HANZ's dot, side by side, and each one's size and where its middle sits in the drawing."""
    src = np.array(Image.open(H.FACE).convert('RGBA'))
    parts, meta, x = [], {}, 0
    for nm, p in PUPILS.items():
        (r0, r1), (c0, c1) = p['rows'], p['cols']
        im = src[r0:r1 + 1, c0:c1 + 1].copy(); im[im[..., 3] > 0, :3] = (16, 14, 18); im[im[..., 3] > 0, 3] = 255
        parts.append(im)
        meta[nm] = {'x': x, 'w': im.shape[1], 'h': im.shape[0], 'cx': (c0 + c1 + 1) / 2, 'cy': (r0 + r1 + 1) / 2}
        x += im.shape[1] + 1
    sheet = np.zeros((max(p.shape[0] for p in parts), x, 4), np.uint8)
    for nm, im in zip(PUPILS, parts): sheet[:im.shape[0], meta[nm]['x']:meta[nm]['x'] + im.shape[1]] = im
    return Image.fromarray(sheet), meta


def texel_to_local(px, py):
    """A pixel of the face drawing -> the point on the front of the mask (its own space) it's drawn at."""
    x0, x1, z0, z1 = H.FACE_UV
    return Vector((x0 + px / 64 * (x1 - x0), -11.05, z0 + (1 - py / 64) * (z1 - z0)))


def eyes(cam, mask_M, meta):
    """Where each pupil's middle lands on the 640x360 view this frame, how many view px one texel is there, and whether
    the eye faces the camera (the mask's normal toward the camera) - for the game to draw it."""
    out = {}
    n = (mask_M.to_3x3() @ Vector((0, -1, 0))).normalized()
    for nm, m in meta.items():
        c = mask_M @ texel_to_local(m['cx'], m['cy'])
        r = mask_M @ texel_to_local(m['cx'] + 1, m['cy'])
        sx, sy = to_screen(cam, c); rx_, ry_ = to_screen(cam, r)
        facing = n.dot((cam.location - c).normalized())
        out[nm] = [round(sx, 1), round(sy, 1), round(math.hypot(rx_ - sx, ry_ - sy), 3), round(facing, 2)]
    return out


# ------------------------------------------------------------------ the desk things that move
def wax_material():
    """The lava lamp's wax: glowing orange, no lighting (PS1 style)."""
    m = bpy.data.materials.get('m_wax')
    if m: return m
    m = bpy.data.materials.new('m_wax'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.42, 0.08, 1); em.inputs['Strength'].default_value = 1.1
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def lava_frame(f, n, base, cam):
    """The lava lamp's wax at frame f of n: blobs of glowing wax rising, stretching, sinking back - each on its own
    slow loop (they all come round to where they started at n). Metaballs inside the glass."""
    lx, ly, b0 = H.LAVA
    mb = bpy.data.metaballs.new('wax'); mb.resolution = 0.6; mb.render_resolution = 0.6; mb.threshold = 0.6
    ob = bpy.data.objects.new('lava_wax', mb); bpy.context.scene.collection.objects.link(ob); ob['prop'] = 1
    t = 2 * math.pi * f / n
    for dx, speed, r, ph in ((0.0, 1, 1.9, 0.0), (1.4, 1, 1.5, 2.1), (-1.0, 2, 1.3, 4.0), (0.6, 1, 1.1, 5.1)):
        hgt = 0.5 - 0.5 * math.cos(speed * t + ph)                                  # 0 bottom .. 1 top
        z = b0 + 7.5 + hgt * 13.0
        wid = 2.9 - abs(hgt - 0.45) * 2.2                                          # (the glass narrows toward the top)
        el = mb.elements.new(); el.co = (lx + dx * min(1, wid / 2.9) * 0.55, ly, z); el.radius = r * (1 + 0.25 * math.sin(t * 2 + ph))
        el.type = 'ELLIPSOID'; el.size_x = 1; el.size_y = 1; el.size_z = 1.0 + 0.6 * math.sin(speed * t + ph)
    el = mb.elements.new(); el.co = (lx, ly, b0 + 6.4); el.radius = 2.4; el.type = 'ELLIPSOID'; el.size_x = 1.1; el.size_y = 1.1; el.size_z = 0.45
    mb.materials.append(wax_material())
    return [ob]


def sand_frame(f, n, base, cam):
    """The hourglass at frame f of n: the bottom bulb's sand stays heaped, the top bulb's clings to its ceiling like a
    stalactite, and a stream of grains runs UP through the neck between them, forever."""
    hx_, hy, hz = H.HOURGLASS
    m = H.Mesh()
    m.hull([(hx_ + r * math.cos(a), hy + r * math.sin(a), hz + z) for a in np.linspace(0, 2 * math.pi, 13)[:-1]
            for r, z in ((2.9, 2.8), (2.6, 4.6), (1.2, 6.2))] + [(hx_, hy, hz + 6.9)], H.SAND)     # the heap at the bottom
    m.hull([(hx_ + r * math.cos(a), hy + r * math.sin(a), hz + z) for a in np.linspace(0, 2 * math.pi, 13)[:-1]
            for r, z in ((3.0, 18.3), (2.6, 16.4), (1.3, 14.4))] + [(hx_, hy, hz + 13.0)], H.SAND)   # ... and hanging from the top
    for g in range(6):                                                            # the grains rising up the neck
        ph = (g / 6 + f / n * 2) % 1.0
        m.box((hx_, hy - 0.6, hz + 6.9 + ph * 7.6), (1.1, 1.1, 1.4), H.SAND)
    ob = H.to_object('sand', m, base); ob['prop'] = 1
    bpy.context.view_layer.update(); H.light_up(ob, cam, snap=True)
    return [ob]


def flame_frame(f, n, base, cam):
    """The candle's flame at frame f of n: a teardrop of fire leaning and stretching as it flickers."""
    cx_, cy_ = H.CANDLE
    t = 2 * math.pi * f / n
    lean = 0.35 * math.sin(t) + 0.15 * math.sin(3 * t + 1); tall = 4.2 + 0.7 * math.sin(2 * t + 0.5) + 0.35 * math.sin(5 * t)
    m = H.Mesh()
    pts = [(cx_ + 0.95 * math.cos(a) * math.cos(e), cy_ + 0.95 * math.sin(a) * math.cos(e), 12.9 + 0.95 * math.sin(e)) for a in np.linspace(0, 2 * math.pi, 9)[:-1] for e in (-1.2, -0.4, 0.4)]
    pts += [(cx_ + lean * k * 1.6 + 0.55 * math.cos(a) * (1 - k), cy_ + 0.55 * math.sin(a) * (1 - k), 13.2 + tall * k) for k in (0.45, 0.8) for a in np.linspace(0, 2 * math.pi, 7)[:-1]]
    pts += [(cx_ + lean * 1.8, cy_, 13.2 + tall)]
    m.hull(pts, 0xffffff)
    ob = H.to_object('candle_flame', m, base); ob['prop'] = 1
    fm = bpy.data.materials.get('m_flame')
    if not fm:
        fm = bpy.data.materials.new('m_flame'); fm.use_nodes = True; nt = fm.node_tree; nt.nodes.clear()
        lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
        cr = nt.nodes.new('ShaderNodeValToRGB'); e = cr.color_ramp.elements
        e[0].color = (1.0, 0.95, 0.6, 1); e[1].position = 0.8; e[1].color = (1.0, 0.4, 0.05, 1)
        nt.links.new(lw.outputs['Facing'], cr.inputs['Fac'])
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
        nt.links.new(cr.outputs['Color'], em.inputs['Color'])
        out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(fm)
    for p in ob.data.polygons: p.material_index = 0
    return [ob]


# name: (the desk pieces it's drawn with, frames in the loop, its fps, the function adding the moving part)
PROPS = {'lava': (['lava'], 48, 8, lava_frame), 'hourglass': (['hourglass', 'hourglass_glass'], 24, 8, sand_frame),
         'candle': (['candle'], 12, 12, flame_frame)}


def render_props(cam, mats, tmp, table):
    """Renders each moving desk thing on its own (him gone, the counter cutting it where it's in front) as a looping
    grid of frames: prop_<name>.png + where it goes (table['props'], in 640x360 view px; drawn at SCALE)."""
    table['props'] = {}
    for name, (pieces, n, fps, fn) in PROPS.items():
        frames = []
        for f in range(n):
            for ob in list(bpy.data.objects):
                if ob.get('prop') or ob.get('hanz'): bpy.data.objects.remove(ob)
            desk('cut')
            for nm in pieces: bpy.data.objects[nm].is_holdout = False
            extra = fn(f, n, mats, cam)
            border(cam, [bpy.data.objects[nm] for nm in pieces] + extra, pad=(6, 6, 6, 6))
            frames.append(shoot(tmp))
        a = np.max([fr[..., 3] for fr in frames], 0)
        ys, xs = np.nonzero(a)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        cols = min(n, 4096 // (x1 - x0)); rows = -(-n // cols)                      # (a grid: no side over 4096 px)
        grid = np.zeros((rows * (y1 - y0), cols * (x1 - x0), 4), np.uint8)
        for i, fr in enumerate(frames):
            r, c = divmod(i, cols); grid[r * (y1 - y0):(r + 1) * (y1 - y0), c * (x1 - x0):(c + 1) * (x1 - x0)] = fr[y0:y1, x0:x1]
        quantize(grid, 200).save(os.path.join(OUT, f'prop_{name}.png'), optimize=True)
        table['props'][name] = {'x': int(x0) * SCALE, 'y': int(y0) * SCALE, 'w': int(x1 - x0), 'h': int(y1 - y0), 'n': n, 'fps': fps, 'cols': cols}
        print(f'prop {name}: {n} frames {x1 - x0}x{y1 - y0}, {os.path.getsize(os.path.join(OUT, f"prop_{name}.png")) // 1024} KB')
    for ob in list(bpy.data.objects):
        if ob.get('prop'): bpy.data.objects.remove(ob)


# ------------------------------------------------------------------ SECOND OPINION's heads
def render_heads(table, size=124):
    """His head for SECOND OPINION (the pop-up after a KO in a match), cut out of his own animation frames - HANZ talking
    (grey side to you), then $@L talking (red side) - centred on his eyes, with his pupils drawn in (the game usually
    draws them), at the game's size: heads.png, two size x size frames side by side."""
    out = []
    pup = Image.open(os.path.join(OUT, 'pupils.png')).convert('RGBA')
    for anim, f in (('hanz_talk', 6), ('sal_talk', 2)):
        fr = table['anims'][anim]['frames'][f]
        sheet = Image.open(os.path.join(OUT, table['anims'][anim]['sheets'][fr['k']])).convert('RGBA')
        crop = sheet.crop((fr['sx'], fr['sy'], fr['sx'] + fr['w'], fr['sy'] + fr['h']))
        crop = crop.resize((fr['w'] * SCALE, fr['h'] * SCALE), Image.NEAREST)
        img = Image.new('RGBA', (VW + size, VH + size))
        img.alpha_composite(crop, (fr['x'], fr['y']))
        for n, m in table['pupils'].items():
            ex_, ey_, sc, facing = fr['eyes'][n]
            if facing < 0.3: continue
            piece = pup.crop((m['x'], 0, m['x'] + m['w'], m['h']))
            pw, ph = max(1, round(m['w'] * sc)), max(1, round(m['h'] * sc))
            img.alpha_composite(piece.resize((pw, ph), Image.NEAREST), (int(round(ex_ - pw / 2)), int(round(ey_ - ph / 2))))
        ex = int((fr['eyes']['sal'][0] + fr['eyes']['hanz'][0]) / 2); ey = int((fr['eyes']['sal'][1] + fr['eyes']['hanz'][1]) / 2)
        y0 = max(0, ey - size // 2 - 22)
        out.append(np.array(img)[y0:y0 + size, ex - size // 2:ex + size // 2])
    quantize(np.concatenate(out, 1), 200).save(os.path.join(OUT, 'heads.png'), optimize=True)


# ------------------------------------------------------------------ main
def drops_for(poses):
    """The frames a blood drop falls from the heart (every so often while it's out)."""
    return [i for i in range(len(poses)) if poses[i].get('heart', 0) > 0.5 and i % 6 == 3]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--preview', default='')
    ap.add_argument('--clips', action='store_true')
    a = ap.parse_args()
    only = [x for x in a.only.split(',') if x]
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_frame.png')
    cam, mats = setup()
    if a.clips:                                                                   # --clips: no rendering, just list every clipping frame
        for name, spec in ANIMS.items():
            if only and name not in only: continue
            for i, pose in enumerate(settle_collar(spec['frames'](), mats, spec.get('loop'))):
                for back in np.arange(0, 30, 0.75):
                    parts, mm, bot = figure(pose, back); place(parts, mats)
                    c = clip_check()
                    if not any(x[:2] == ('torso', 'counter') for x in c): break
                if c: print(f'{name} {i}: {c}', flush=True)
            print(f'{name} checked', flush=True)
        return
    psheet, pmeta = pupil_sheet(); psheet.save(os.path.join(OUT, 'pupils.png'))
    table = {'pupils': pmeta, 'pupilK': 1, 'scale': SCALE, 'fps': FPS, 'anims': {}, 'props': {}}
    if os.path.exists(TABLE) and only:
        old = json.loads(open(TABLE).read().split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
        table['anims'] = old.get('anims', {}); table['props'] = old.get('props', {})
        if 'counter' in old: table['counter'] = old['counter']
        if 'hits' in old: table['hits'] = old['hits']
    if not only or 'counter' in only:                                             # the counter and what stands on it still
        for ob in list(bpy.data.objects):
            if ob.get('hanz'): bpy.data.objects.remove(ob)
        desk('show')
        for nm in ('lava', 'hourglass', 'hourglass_glass', 'candle'): bpy.data.objects[nm].hide_render = True
        bpy.context.scene.render.use_border = False
        ccrop, cx, cy = trim(shoot(tmp))
        quantize(ccrop).save(os.path.join(OUT, 'counter.png'), optimize=True)
        table['counter'] = [cx * SCALE, cy * SCALE]
        table['hits'] = desk_hits(cam)
    if not only or 'props' in only: render_props(cam, mats, tmp, table)
    for name, spec in ANIMS.items():
        if only and name not in only: continue
        poses = settle_collar(spec['frames'](), mats, spec.get('loop'))
        crops, info, drops, born = [], [], [], set(drops_for(poses))
        for i, pose in enumerate(poses):
            pose = dict(pose); pose['_t'] = i / FPS
            drops = [(p, v) for p, v in drops if p[2] > 1.2]                       # (a drop reaching the counter is gone)
            img, mask_M, bot, clips = render_pose(cam, mats, pose, tmp, [p for p, v in drops])
            if clips: print(f'  {name} frame {i}: CLIPPING {clips}')
            drops = [((p[0], p[1], p[2] - v), v + 0.55) for p, v in drops]
            if i in born and bot is not None: drops.append(((bot.x, bot.y, bot.z), 0.3))
            crop, x, y = trim(img)
            crops.append(crop); info.append({'x': x * SCALE, 'y': y * SCALE, 'eyes': eyes(cam, mask_M, pmeta)})
            print(f'  {name} {i + 1}/{len(poses)}', flush=True)
        files = pack(crops, name, info)
        table['anims'][name] = {'loop': bool(spec.get('loop')), 'lazy': bool(spec.get('lazy')), 'sheets': files, 'frames': info}
        print(f'{name}: {len(crops)} frames, sheets {files}, {sum(os.path.getsize(os.path.join(OUT, f)) for f in files) // 1024} KB', flush=True)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            fr = []
            bg = Image.new('RGBA', (VW, VH), (60, 50, 72, 255))
            if os.path.exists(os.path.join(OUT, 'counter.png')):
                c = Image.open(os.path.join(OUT, 'counter.png')).convert('RGBA')
                bg.alpha_composite(c.resize((c.width * SCALE, c.height * SCALE), Image.NEAREST), tuple(table['counter']))
            for f, c in zip(info, crops):
                can = bg.copy(); im = Image.fromarray(c); can.alpha_composite(im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST), (f['x'], f['y'])); fr.append(can.convert('RGB'))
            fr[0].save(os.path.join(a.preview, f'{name}.gif'), save_all=True, append_images=fr[1:], duration=1000 // FPS, loop=0)
    if 'hanz_talk' in table['anims'] and 'sal_talk' in table['anims']: render_heads(table)
    with open(TABLE, 'w') as fh:
        fh.write('// HANZ / $@L\'s animations in the LOST room - generated by tools/sprites/hanz_anim.py: do not edit by hand.\n')
        fh.write('// Everything is rendered PS1-style at 320x180 and drawn at `scale` (2). anims[name].frames[i]: x, y = where the\n')
        fh.write('// frame goes on the 640x360 view; k = which of anims[name].sheets (public/assets/shop/lost/) it is on, sx, sy, w, h =\n')
        fh.write('// where on it (sheet px); eyes.sal / eyes.hanz = [view x, view y, view px per texel, facing] for the pupils (pupils.png,\n')
        fh.write('// laid out in `pupils`); lazy = loaded after the room opens; counter = where counter.png goes; props = the moving\n')
        fh.write('// desk things (prop_<name>.png grids, cols to a row).\n')
        fh.write('export const LOST_FRAMES = ' + json.dumps(table, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
