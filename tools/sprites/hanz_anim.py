"""HANZ / $@L's animations for the LOST room, path-traced in Blender (Cycles) from the model in hanz_3d.py.

Every frame his whole figure is rebuilt from a POSE and rendered through the LOST room's camera (640x360), lit like
his room (hanz_3d.lights) - real soft shadows, bounce light, glossy hair and horn, the wet heart:
  body    hips position + lean (rx) + turn (rz)
  head    yaw / pitch / roll about his neck (yaw > 0 turns his face to the picture's right, showing more of $@L's red
          left half; yaw < 0 shows more of HANZ's grey right half)
  l / r   each arm: where the wrist goes (w = in the room, or wb = on his own body when b = 1 - so a hand can reach
          into his chest while he moves), which way the elbow points (pole), the fingers point (dir) and the back of
          the hand faces (nrm), and how far each finger is curled (curl: index..pinky, 0 straight - 1 a fist; negative
          lifts it), how far they're spread, where the thumb is. Elbows come from two-bone IK (UPPER / FORE).
  hatch   how far the little hatch in his chest is open (degrees); heart = his clock-heart in HANZ's hand (0/1),
          clock = its hands' angles.
Animations are key poses with timings in seconds (KEYS) and an ease into each key ('io', 'out', 'in', 'back' =
overshoot and settle, 'snap' = cut straight to it); his head trails the body a little (LAG) so moves flow.
The counter and everything on it are SHADOW CATCHERS while he renders: they cut him out where they're in front of him
and keep his shadow, so the game draws: room, counter, the desk things, him (his shadow falls on them).

His PUPILS are not in the face texture: $@L's dripping iris and HANZ's dot are cut out of the drawing (PUPILS) and the
game draws them (pupils.png, smooth, with a glint) at the spot this script exports per frame, nudged toward whatever
he's watching - so his eyes track what you're about to buy.

The desk things that move (PROPS) are rendered on their own as looping strips: the lava lamp (metaball wax), the
hourglass whose sand falls up, the candle's flame.

Run:  python3 tools/sprites/hanz_anim.py [--only idle,heart,props,...] [--preview DIR] [--samples N]
      -> public/assets/shop/lost/hanz_<anim>[_<k>].png (frames trimmed and packed, palette PNGs), counter.png,
         prop_<name>.png, pupils.png, heads.png and src/scenes/lostFrames.js (generated: do not edit by hand)
Needs bpy (pip install bpy) and imagequant (pip install imagequant: the palettes keep the soft edges).
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
CLEAR = 23.5                                     # the counter's back edge (y) - his coat stays behind it below the top
FPS = 15                                         # frames are rendered at 15 a second (the game holds each 4 ticks)
SAMPLES = 24                                     # path-tracing samples per pixel (then denoised)
HEART_SCALE = 1.35                               # his heart's size in his hand
LAG = 0.5                                        # how fast his head catches up with where it's going each frame (1 = no lag)
SHADOW_MIN, SHADOW_MAX, SHADOW_AREA = 30, 140, 160   # his shadow on the desk: fainter is dropped, darker capped, smaller patches dropped
PUPIL_K = 6                                      # pupils.png is drawn this many pixels per texel of the face drawing
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


def arm(w=None, wb=None, pole=(1, 0.2, 0.9), dir=(0, -1, 0), nrm=(0, 0, 1), grip='flat', curl=None, b=0.0, spread=None, thumb=None):
    """One arm's part of a pose (see the top of the file). grip picks curls / spread / thumb unless given."""
    c, sp, th = GRIPS[grip]
    return {'w': tuple(w or (0, 0, 0)), 'wb': tuple(wb or (0, 0, 0)), 'b': b, 'pole': pole, 'dir': dir, 'nrm': nrm,
            'curl': tuple(curl or c), 'spread': sp if spread is None else spread, 'thumb': th if thumb is None else thumb}


L_FLAT = arm((-28, -11, 3.1), pole=(-1, 0.2, 0.9), dir=(0.18, -1, 0))
R_FLAT = arm((28, -11, 3.1), pole=(1, 0.2, 0.9), dir=(-0.18, -1, 0))
BASE = {'body': (0, 42, -4, 38, 0), 'head': (0, 4, -7), 'l': L_FLAT, 'r': R_FLAT, 'hatch': 0.0, 'heart': 0.0, 'clock': (300.0, 60.0)}


def P(body=None, head=None, l=None, r=None, **kw):
    """A pose: BASE with some parts changed. l / r = an arm(...) or a dict of changes to the flat arm."""
    p = dict(BASE); p.update(kw)
    if body: p['body'] = body
    if head: p['head'] = head
    for k, v in (('l', l), ('r', r)):
        if v is None: continue
        if 'curl' in v and 'spread' in v: p[k] = v
        else: q = dict(BASE[k]); q.update(v); p[k] = q
    return p


def lerp(a, b, t):
    """Blends two poses (numbers and tuples blend; anything else switches halfway)."""
    if isinstance(a, dict): return {k: lerp(a[k], b[k], t) for k in a}
    if isinstance(a, (tuple, list)): return tuple(lerp(x, y, t) for x, y in zip(a, b))
    if isinstance(a, (int, float)): return a + (b - a) * t
    return a if t < 0.5 else b


def ease(t, kind='io'):
    """How a move gets from one key to the next: io = slow in and out, out = fast then settling, in = speeding up,
    back = overshoots a little and settles back, snap = jumps."""
    if kind == 'snap': return 1.0
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
POINT = arm((-17, -34, 20), pole=(-1, -0.2, -1), dir=(0.1, -1, 0.15), grip='point')
POINT2 = arm((-14, -40, 17), pole=(-1, -0.2, -1), dir=(0.1, -1, 0.02), grip='point')
FIST_UP = lambda s: arm((s * 22, -14, 33), pole=(s, 0.4, -0.2), dir=(0, -0.2, 1), nrm=(0, -1, 0), grip='fist')
FIST_HI = lambda s: arm((s * 20, -8, 44), pole=(s, 0.5, -0.4), dir=(0, 0.1, 1), nrm=(0, -1, 0), grip='fist')
FIST_DOWN = lambda s: arm((s * 22, -12, 7.5), pole=(s, 0.4, 0.9), dir=(0, -1, 0), grip='fist')
OPEN_WIDE = lambda s: arm((s * 52, -16, 26), pole=(s, 0.6, -0.6), dir=(s * 0.6, -0.5, 0.6), nrm=(0, -0.4, -1), grip='open')
OPEN_WIDER = lambda s: arm((s * 54, -18, 30), pole=(s, 0.6, -0.6), dir=(s * 0.7, -0.4, 0.7), nrm=(0, -0.4, -1), grip='open', spread=0.8)
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


def idle():
    """The idle: too calm. Barely moving, breathing; his head drifts into a crooked tilt and back; HANZ's grey fingers
    drum the counter now and then."""
    n = 60
    fr = frames_of([(0, P()), (1.4, P(head=(3, 6, -11))), (2.6, P(head=(-2, 4, -5))), (4, P())], loop=True)
    out = []
    for i, p in enumerate(fr):
        q = dict(p); r = dict(q['r']); r['curl'] = drum(i, n) if i < n * 0.55 else r['curl']; q['r'] = r; out.append(q)
    return breathe(follow(out, loop=True), 1.0)


def twitch():
    """Something's off: his head snaps over to a horrible crooked angle, hangs there, then cranks back in little jerks."""
    snap = P(body=(0, 42, -4, 39, 3), head=(14, -6, -32))
    keys = [(0, P()), (0.13, snap, 'snap'), (0.8, P(body=(0, 42, -4, 39, 3), head=(15, -5, -34))),
            (0.93, P(head=(10, -2, -24)), 'snap'), (1.13, P(head=(6, 1, -17)), 'snap'), (1.33, P(head=(3, 3, -11)), 'snap'),
            (1.73, P(), 'io')]
    return breathe(frames_of(keys), 0.6)


def heart():
    """The clock-heart (an idle now and then): HANZ's grey hand rises to the hatch in his chest, it swings open (a red
    glow inside), he reaches in and draws out his heart - dark, wet, dripping, a pocket watch wound into it - lifts it
    beside his face, peers at it while its hands spin round and stop, sighs, puts it back and shuts the hatch."""
    lean = (2, 44, -3, 26, -6)                      # sitting back off the counter a little, turned to show the chest
    look = (-6, 18, -9)                              # head down to his chest
    reach = arm(wb=(9.5, -21, 27), b=1, pole=(1, -0.4, -0.6), dir=(0, 1, 0.1), nrm=(0, 0, 1), grip='reach')
    inside = arm(wb=(9.5, -16.5, 27), b=1, pole=(1, -0.4, -0.6), dir=(0, 1, 0.1), nrm=(0, 0, 1), grip='cup')
    out_ = arm(wb=(10, -24, 26), b=1, pole=(1, -0.4, -0.6), dir=(0, 1, 0.3), nrm=(0, 0, 1), grip='cup')
    hold = arm((24, -36, 38), pole=(1, 0.1, -0.8), dir=(-0.45, -0.6, 0.15), nrm=(0, 0.1, -1), grip='cup')
    hold2 = arm((25, -38, 39.5), pole=(1, 0.1, -0.8), dir=(-0.45, -0.6, 0.2), nrm=(0, 0.1, -1), grip='cup')
    peer = (20, 10, -14); sigh = (16, 16, -8)
    k = [(0.0, P()),
         (0.6, P(body=lean, head=look, r=reach), 'io'),
         (0.95, P(body=lean, head=look, r=reach, hatch=105), 'back'),
         (1.3, P(body=lean, head=look, r=inside, hatch=105), 'io'),
         (1.45, P(body=lean, head=look, r=inside, hatch=105, heart=1), 'snap'),
         (1.85, P(body=lean, head=(4, 12, -10), r=out_, hatch=105, heart=1), 'out'),
         (2.5, P(body=lean, head=peer, r=hold, hatch=105, heart=1, clock=(300, 60)), 'io'),
         (3.0, P(body=lean, head=(18, 4, -16), r=hold2, hatch=105, heart=1, clock=(300, 60)), 'io'),
         (4.0, P(body=lean, head=(18, 4, -16), r=hold2, hatch=105, heart=1, clock=(330, 60 + 720)), 'out'),
         (4.6, P(body=(2, 44, -4, 28, -6), head=sigh, r=hold, hatch=105, heart=1, clock=(330, 780)), 'io'),
         (5.2, P(body=lean, head=look, r=out_, hatch=105, heart=1, clock=(330, 780)), 'io'),
         (5.55, P(body=lean, head=look, r=inside, hatch=105, heart=1, clock=(330, 780)), 'io'),
         (5.62, P(body=lean, head=look, r=inside, hatch=105, heart=0, clock=(330, 780)), 'snap'),
         (5.95, P(body=lean, head=look, r=reach, hatch=105), 'io'),
         (6.25, P(body=lean, head=look, r=reach, hatch=0), 'in'),
         (7.0, P(), 'io')]
    fr = frames_of(k)
    for p in fr: p['clock'] = (p['clock'][0] % 360, p['clock'][1] % 360)
    return breathe(follow(fr), 0.8)


def look(side):
    """Turning to look along the counter at the cards (side -1 = his left / picture left, +1 = right, 0 = down)."""
    tgt = {-1: P(body=(-6, 42, -4, 40, 9), head=(-15, 10, -4)), 1: P(body=(6, 42, -4, 40, -9), head=(15, 10, -10)),
           0: P(body=(0, 40, -6, 46, 0), head=(0, 22, -5))}[side]
    return follow(frames_of([(0, P()), (0.53, tgt, 'out')]), 0.6)


ANIMS = {
    'idle': {'loop': True, 'frames': idle},
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
        (0.6, P(body=(0, 40, -7, 48, 0), head=(20, 10, 4), l=FIST_DOWN(-1), r=FIST_DOWN(1)), 'in'),
        (0.75, P(body=(0, 41, -5, 43, 0), head=(18, 4, 2), l=FIST_DOWN(-1), r=FIST_DOWN(1)), 'out'),
        (1.2, P(body=(0, 41, -5.5, 44, 0), head=(16, 6, 0), l=FIST_DOWN(-1), r=FIST_DOWN(1)))]), 0.65)},
    # welcome: dips, then rises off the counter and throws his arms wide, palms open, head tipped - and sinks back
    'greet': {'frames': lambda: breathe(follow(frames_of([
        (0, P()), (0.25, P(body=(0, 41, -6, 42, 0), head=(0, 10, -4)), 'io'),
        (0.75, P(body=(0, 44, 1, 20, 0), head=(0, -8, -16), l=OPEN_WIDER(-1), r=OPEN_WIDER(1)), 'back'),
        (1.4, P(body=(0, 44, 1.5, 19, 0), head=(5, -9, -18), l=OPEN_WIDE(-1), r=OPEN_WIDE(1))),
        (2.0, P(), 'io')])), 0.6)},
    # sold! $@L rubs his hands together, leaning in, head bobbing with it
    'sold': {'loop': True, 'frames': lambda: follow(frames_of([
        (0, P(body=(0, 41, -3, 42, 0), head=(14, 0, 6), l=RUB(0)[0], r=RUB(0)[1])),
        (0.4, P(body=(0, 41, -3.4, 43, 0), head=(17, -3, 9), l=RUB(1)[0], r=RUB(-3)[1])),   # (his left hand only slides in a little: further, its sleeve met the collar)
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
                       if (a, b) not in H.NO_CLIP] + [('heart', 'face'), ('heart', 'hair'), ('heart', 'collar_r'), ('heart', 'counter')]


def ik(S, W, pole):
    """Two-bone IK: the elbow for a shoulder S and wrist W (bones UPPER, FORE), bent toward pole. Returns (elbow, wrist)
    - the wrist pulled in if it was out of reach."""
    S, W, pole = np.array(S, float), np.array(W, float), np.array(pole, float)
    d = W - S; L = np.linalg.norm(d); n = d / L
    L = min(L, UPPER + FORE - 0.5); W = S + n * L
    x = (UPPER ** 2 - FORE ** 2 + L ** 2) / (2 * L); h = math.sqrt(max(UPPER ** 2 - x ** 2, 0))
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
        a = -s * (4.4 - 2.95 * i)
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
    tb = w + d * 3 + u * (-s * 4.4) - nrm * (0.1 + 0.5 * thumb)
    td = d * (0.75 - 0.6 * thumb) + u * (-s) * (0.65 - 1.35 * thumb) - nrm * (0.85 * thumb); td /= np.linalg.norm(td)
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


def figure(pose, back=0.0):
    """All of him in a pose: {name: (Mesh, world matrix or None)}, the head's world matrix, and where his heart's
    bottom is (for blood drops) or None."""
    body = body_matrix(pose, back)
    neck_top = body @ Vector((0, 1, 50))
    yaw, pitch, roll = pose['head']
    head_M = (H.T(*neck_top) @ H.T(rz=yaw) @ H.T(rx=pitch) @ H.T(ry=roll) @ H.T(0, -4, 17) @ Matrix.Scale(H.HEAD_SCALE, 4))
    out = {nm: (m, None) for nm, m in H.coat(body, pose.get('hatch', 0)).items()}
    for nm, m in H.head().items(): out[nm] = (m, head_M)
    bot = None
    rot = np.array(body.to_3x3())
    for s, key, tag in ((-1, 'l', 'sal'), (1, 'r', 'hanz')):
        a = pose[key]
        S = tuple(body @ Vector((s * 24, 0, 41)))
        b = a['b']
        Wt = np.array(a['w']) * (1 - b) + np.array(body @ Vector(a['wb'])) * b
        dd = np.array(a['dir']) * (1 - b) + rot @ np.array(a['dir']) * b
        nn = np.array(a['nrm']) * (1 - b) + rot @ np.array(a['nrm']) * b
        E, W = ik(S, tuple(Wt), a['pole'])
        out['sleeve_' + tag] = (sleeve(s, S, E, W, body), None)
        hm, palm, up = hand(s, W, dd, nn, a['curl'], a['spread'], a['thumb'])
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
    return out, head_M, bot


# ------------------------------------------------------------------ rendering
def setup(samples=SAMPLES):
    """The scene: lights, materials, the counter and the desk things (built once), the camera. Returns (camera, mats)."""
    H.build('lean')                                                               # (render settings, lights, materials, counter)
    mats = H.build.mats
    for ob in list(bpy.data.objects):
        if ob.type == 'MESH' and ob.name not in ('counter', 'bell', 'till', 'watch'): bpy.data.objects.remove(ob)
    # the face material with the pupils cut out of the drawing (the game draws them, so they can move)
    src = np.array(Image.open(H.FACE).convert('RGBA'))
    for p in PUPILS.values():
        (r0, r1), (c0, c1) = p['rows'], p['cols']; src[r0:r1 + 1, c0:c1 + 1, 3] = 0
    bs = next(n for n in mats['face'].node_tree.nodes if n.type == 'TEX_IMAGE'); bs.image = H.face_image(src)
    for nm, m in H.props().items():
        ob = H.to_object(nm, m, mats); ob['desk'] = 1
    # the desk things glow on him: the lava lamp's pink, the candle's flame
    for nm, (x, y, z), col, en in (('lava_glow', (H.LAVA[0], H.LAVA[1] - 3, H.LAVA[2] + 14), (1.0, 0.4, 0.5), 2.2e4),
                                   ('candle_glow', (H.CANDLE[0], H.CANDLE[1], 15), (1.0, 0.6, 0.25), 1.1e4)):
        ld = bpy.data.lights.new(nm, 'POINT'); ld.color = col; ld.energy = en; ld.shadow_soft_size = 2
        ob = bpy.data.objects.new(nm, ld); bpy.context.scene.collection.objects.link(ob); ob.location = (x, y, z)
    cam = bpy.data.objects['cam']
    loc, tgt, lens = CAM
    cam.location = loc; cam.data.lens = lens
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc = bpy.context.scene; sc.render.resolution_x = VW; sc.render.resolution_y = VH; sc.render.resolution_percentage = 100
    sc.cycles.samples = samples; sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = True
    return cam, mats


def desk(mode):
    """How the counter and the desk things take part in a render: 'catch' = shadow catchers (cut him out where they're in
    front, keep his shadow), 'show' = rendered as themselves, 'hide' = left out."""
    for nm in DESK:
        ob = bpy.data.objects.get(nm)
        if not ob: continue
        ob.hide_render = mode == 'hide'; ob.is_shadow_catcher = mode == 'catch'


def to_screen(cam, p):
    """A world point -> pixel on the 640x360 view."""
    v = world_to_camera_view(bpy.context.scene, cam, Vector(p))
    return v.x * VW, (1 - v.y) * VH


def border(cam, obs, pad=(36, 14, 36, 40)):
    """Renders only the box round these objects (plus pad = left, top, right, bottom px - room for his shadow)."""
    xs, ys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in obs:
        for c in ob.bound_box:
            x, y = to_screen(cam, ob.matrix_world @ Vector(c)); xs.append(x); ys.append(y)
    sc = bpy.context.scene
    x0, x1 = max(0, min(xs) - pad[0]), min(VW, max(xs) + pad[2]); y0, y1 = max(0, min(ys) - pad[1]), min(VH, max(ys) + pad[3])
    sc.render.use_border = True; sc.render.use_crop_to_border = False
    sc.render.border_min_x = x0 / VW; sc.render.border_max_x = x1 / VW
    sc.render.border_min_y = 1 - y1 / VH; sc.render.border_max_y = 1 - y0 / VH


FAST = False                                     # --fast: half size, few samples, previews only (to check the motion)


def shoot(path):
    """Renders the view to path and returns it (RGBA array, 640x360)."""
    sc = bpy.context.scene; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = Image.open(path).convert('RGBA')
    if im.size != (VW, VH): im = im.resize((VW, VH), Image.NEAREST)
    return np.array(im)


def place(parts, mats):
    """Puts his parts in the scene (tagged 'hanz', replacing the last frame's)."""
    for ob in list(bpy.data.objects):
        if ob.get('hanz'): bpy.data.objects.remove(ob)
    obs = []
    for nm, (m, M) in parts.items():
        ob = H.to_object(nm, m, mats, face_box=H.FACE_UV if nm == 'face' else None)
        ob['hanz'] = 1
        if M is not None: ob.matrix_world = M
        obs.append(ob)
    return obs


def clip_check():
    """Every NO_CLIP pair passing through each other this frame (the desk included)."""
    old = H.NO_CLIP; H.NO_CLIP = NO_CLIP
    try: return H.clip_check()
    finally: H.NO_CLIP = old


def render_pose(cam, mats, pose, path, drops=()):
    """Builds him in a pose (standing back as far as he must to clear the counter) plus any falling blood drops, renders
    him through the room camera with the desk as shadow catchers, and returns (RGBA image, head matrix, heart bottom)."""
    for back in np.arange(0, 30, 0.75):
        parts, head_M, bot = figure(pose, back)
        for i, p in enumerate(drops): parts['drop%d' % i] = (H.drop(p), None)
        obs = place(parts, mats)
        if not any(c[:2] == ('torso', 'counter') for c in clip_check()): break
    desk('catch'); border(cam, obs)
    return clean(shoot(path)), head_M, bot


def clean(img):
    """Keeps him and his real shadows, drops the shadow catcher's faint junk: coloured see-through pixels only right at
    his edges (his anti-aliasing); the dark see-through ones (his shadow on the desk) smoothed (the catcher's noise
    blurred away), kept only where they make a real patch of shadow (SHADOW_MIN, at least SHADOW_AREA px), and
    softened to at most SHADOW_MAX."""
    from scipy.ndimage import binary_dilation, gaussian_filter, label
    a = img[..., 3].astype(float); rgb = img[..., :3].astype(int)
    solid = a > 200; near = binary_dilation(solid, iterations=2)
    coloured = rgb.max(-1) >= 26
    out = img.copy()
    edge = (~solid) & near
    raw = np.where((~solid) & (~coloured) & ~near, a, 0)
    sm = gaussian_filter(raw, 1.8)
    keep = sm >= SHADOW_MIN
    lab, n = label(keep)
    if n:
        sizes = np.bincount(lab.ravel()); small = sizes < SHADOW_AREA; small[0] = False
        keep &= ~small[lab]
    body = solid | edge                                                           # (stray specks off his body go too)
    lab, n = label(binary_dilation(body, iterations=1))
    if n > 1:
        sizes = np.bincount(lab.ravel()); sizes[0] = 0
        out[(lab > 0) & (sizes[lab] < 60)] = 0; body &= ~((lab > 0) & (sizes[lab] < 60)); solid &= body; edge &= body
    out[~solid & ~edge] = 0
    out[keep & ~solid & ~edge, :3] = (8, 4, 12)
    out[keep & ~solid & ~edge, 3] = np.minimum(sm[keep & ~solid & ~edge] * 1.1, SHADOW_MAX).astype(np.uint8)
    return out


def trim(img, cut=6):
    """Crops to what's drawn (alpha over cut); returns (crop, x, y)."""
    ys, xs = np.nonzero(img[..., 3] > cut)
    if not len(xs): return img[:1, :1], 0, 0
    c = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(); c[c[..., 3] <= cut] = 0
    return c, int(xs.min()), int(ys.min())


def quantize(arr, colours=256, dither=0.35):
    """An RGBA picture -> a palette PNG image (libimagequant: soft edges and shadows keep their see-through levels)."""
    import imagequant
    im = imagequant.quantize_pil_image(Image.fromarray(arr), dithering_level=dither, max_colors=colours, min_quality=0, max_quality=100)
    return im


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
            path = os.path.join(OUT, f'_try.png'); quantize(sheet).save(path, optimize=True)
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
    """The two pupils, smooth (the drawing's pixels rounded off at PUPIL_K px per texel) with a little wet glint:
    pupils.png = $@L's iris then HANZ's dot, side by side, and each one's size and where its middle sits in the drawing."""
    src = np.array(Image.open(H.FACE).convert('RGBA'))
    parts, meta, x = [], {}, 0
    k = PUPIL_K
    for nm, p in PUPILS.items():
        (r0, r1), (c0, c1) = p['rows'], p['cols']
        cut = src[r0 - 1:r1 + 2, c0 - 1:c1 + 2, 3] > 0
        if cut.sum() <= 6: cut = np.zeros_like(cut); cut[1:-1, 1:-1] = True             # (a tiny dot: a round blob)
        big = np.kron(cut.astype(float), np.ones((k, k)))
        from scipy.ndimage import gaussian_filter
        a = np.clip((gaussian_filter(big, k * 0.55) - 0.3) * 4, 0, 1)
        im = np.zeros(a.shape + (4,), np.uint8); im[..., :3] = (14, 10, 14); im[..., 3] = (a * 255).astype(np.uint8)
        ys, xs = np.nonzero(a > 0.5)
        gy, gx = int(ys.min() + (ys.max() - ys.min()) * 0.25), int(xs.min() + (xs.max() - xs.min()) * 0.3)
        rr = max(2, k // 2)
        yy, xx = np.ogrid[:a.shape[0], :a.shape[1]]
        glint = np.clip(1 - np.hypot(yy - gy, xx - gx) / rr, 0, 1) ** 0.7 * (a > 0.5)
        im[..., :3] = (im[..., :3] * (1 - glint[..., None]) + np.array((240, 236, 240)) * glint[..., None]).astype(np.uint8)
        parts.append(im)
        meta[nm] = {'x': x, 'w': im.shape[1], 'h': im.shape[0], 'cx': (c0 + c1 + 1) / 2, 'cy': (r0 + r1 + 1) / 2}
        x += im.shape[1] + 2
    sheet = np.zeros((max(p.shape[0] for p in parts), x, 4), np.uint8)
    for nm, im in zip(PUPILS, parts): sheet[:im.shape[0], meta[nm]['x']:meta[nm]['x'] + im.shape[1]] = im
    return Image.fromarray(sheet), meta


def texel_to_local(px, py):
    """A pixel of the face drawing -> the point on the front of the head (head space) it's drawn at."""
    x0, x1, z0, z1 = H.FACE_UV
    return Vector((x0 + px / 64 * (x1 - x0), -11.05, z0 + (1 - py / 64) * (z1 - z0)))


def eyes(cam, head_M, meta):
    """Where each pupil's middle lands on screen this frame, how many screen px one texel is there, and whether the eye
    faces the camera (the face plate's normal toward the camera) - for the game to draw it."""
    out = {}
    n = (head_M.to_3x3() @ Vector((0, -1, 0))).normalized()
    for nm, m in meta.items():
        c = head_M @ texel_to_local(m['cx'], m['cy'])
        r = head_M @ texel_to_local(m['cx'] + 1, m['cy'])
        sx, sy = to_screen(cam, c); rx_, ry_ = to_screen(cam, r)
        facing = n.dot((cam.location - c).normalized())
        out[nm] = [round(sx, 1), round(sy, 1), round(math.hypot(rx_ - sx, ry_ - sy), 3), round(facing, 2)]
    return out


# ------------------------------------------------------------------ the desk things that move
def lava_frame(f, n, base):
    """The lava lamp's wax at frame f of n: blobs of glowing wax rising, stretching, sinking back - each on its own
    slow loop (they all come round to where they started at n). Metaballs inside the glass."""
    lx, ly, b0 = H.LAVA
    mb = bpy.data.metaballs.new('wax'); mb.resolution = 0.25; mb.render_resolution = 0.18; mb.threshold = 0.6
    ob = bpy.data.objects.new('lava_wax', mb); bpy.context.scene.collection.objects.link(ob); ob['prop'] = 1
    t = 2 * math.pi * f / n
    blobs = [(0.0, 1, 1.9, 0.0), (1.4, 1, 1.5, 2.1), (-1.0, 2, 1.3, 4.0), (0.6, 1, 1.1, 5.1)]
    for dx, speed, r, ph in blobs:
        h = 0.5 - 0.5 * math.cos(speed * t + ph)                                   # 0 bottom .. 1 top
        z = b0 + 7.5 + h * 13.0
        wid = 2.9 - abs(h - 0.45) * 2.2                                           # (the glass narrows toward the top)
        el = mb.elements.new(); el.co = (lx + dx * min(1, wid / 2.9) * 0.55, ly, z); el.radius = r * (1 + 0.25 * math.sin(t * 2 + ph))
        el.type = 'ELLIPSOID'; el.size_x = 1; el.size_y = 1; el.size_z = 1.0 + 0.6 * math.sin(speed * t + ph)
    el = mb.elements.new(); el.co = (lx, ly, b0 + 6.4); el.radius = 2.4; el.type = 'ELLIPSOID'; el.size_x = 1.1; el.size_y = 1.1; el.size_z = 0.45   # (the pool at the bottom)
    mb.materials.append(base['lavawax'])
    return [ob]


def sand_frame(f, n, base):
    """The hourglass at frame f of n: the bottom bulb's sand stays heaped, the top bulb's clings to its ceiling like a
    stalactite, and a thin stream of grains runs UP through the neck between them, forever."""
    hx_, hy = H.HOURGLASS
    m = H.Mesh()
    m.hull([(hx_ + r * math.cos(a), hy + r * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 13)[:-1]
            for r, z in ((2.9, 2.8), (2.6, 4.6), (1.2, 6.2))] + [(hx_, hy, 6.9)], H.SAND)     # the heap at the bottom
    m.hull([(hx_ + r * math.cos(a), hy + r * math.sin(a), z) for a in np.linspace(0, 2 * math.pi, 13)[:-1]
            for r, z in ((2.7, 18.2), (2.2, 16.6), (0.9, 15.3))] + [(hx_, hy, 14.4)], H.SAND)   # ... and hanging from the top
    rng = np.random.default_rng(11)
    for g in range(16):                                                           # the grains rising up the neck
        ph = (g / 16 + f / n * 2) % 1.0
        z = 6.9 + ph * 7.6; x = hx_ + rng.uniform(-0.25, 0.25); y = hy + rng.uniform(-0.25, 0.25)
        m.box((x, y, z), (0.32, 0.32, 0.5), H.SAND)
    ob = H.to_object('sand', m, base, bevel=False); ob['prop'] = 1
    return [ob]


def flame_frame(f, n, base):
    """The candle's flame at frame f of n: a teardrop of fire leaning and stretching as it flickers."""
    cx_, cy_ = H.CANDLE
    t = 2 * math.pi * f / n
    lean = 0.35 * math.sin(t) + 0.15 * math.sin(3 * t + 1); tall = 4.2 + 0.7 * math.sin(2 * t + 0.5) + 0.35 * math.sin(5 * t)
    m = H.Mesh()
    pts = [(cx_ + 0.95 * math.cos(a) * math.cos(e), cy_ + 0.95 * math.sin(a) * math.cos(e), 12.9 + 0.95 * math.sin(e)) for a in np.linspace(0, 2 * math.pi, 9)[:-1] for e in (-1.2, -0.4, 0.4)]
    pts += [(cx_ + lean * k * 1.6 + 0.55 * math.cos(a) * (1 - k), cy_ + 0.55 * math.sin(a) * (1 - k), 13.2 + tall * k) for k in (0.45, 0.8) for a in np.linspace(0, 2 * math.pi, 7)[:-1]]
    pts += [(cx_ + lean * 1.8, cy_, 13.2 + tall)]
    m.hull(pts, 0xffffff)
    ob = H.to_object('candle_flame', m, base, bevel=False); ob['prop'] = 1
    fm = bpy.data.materials.get('m_flame')
    if not fm:
        fm = bpy.data.materials.new('m_flame'); fm.use_nodes = True; nt = fm.node_tree; nt.nodes.clear()
        lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
        cr = nt.nodes.new('ShaderNodeValToRGB'); e = cr.color_ramp.elements
        e[0].color = (1.0, 0.95, 0.7, 1); e[1].position = 0.8; e[1].color = (1.0, 0.35, 0.04, 1)
        nt.links.new(lw.outputs['Facing'], cr.inputs['Fac'])
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 9
        nt.links.new(cr.outputs['Color'], em.inputs['Color'])
        out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(fm)
    return [ob]


# name: (the desk pieces it's drawn with, frames in the loop, its fps, the function adding the moving part)
PROPS = {'lava': (['lava'], 48, 8, lava_frame), 'hourglass': (['hourglass', 'hourglass_glass'], 24, 8, sand_frame),
         'candle': (['candle'], 12, 12, flame_frame)}


def render_props(cam, mats, tmp, table):
    """Renders each moving desk thing on its own (him gone, the counter catching its shadow) as a looping strip:
    prop_<name>.png + where it goes (table['props'])."""
    table['props'] = {}
    for name, (pieces, n, fps, fn) in PROPS.items():
        frames = []
        for f in range(n):
            for ob in list(bpy.data.objects):
                if ob.get('prop') or ob.get('hanz'): bpy.data.objects.remove(ob)
            desk('catch')
            for nm in pieces: bpy.data.objects[nm].is_shadow_catcher = False
            extra = fn(f, n, mats)
            border(cam, [bpy.data.objects[nm] for nm in pieces] + extra, pad=(26, 10, 26, 14))
            frames.append(shoot(tmp))
        a = np.max([fr[..., 3] for fr in frames], 0)
        ys, xs = np.nonzero(a > 6)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        strip = np.concatenate([fr[y0:y1, x0:x1] for fr in frames], 1)
        strip[strip[..., 3] <= 6] = 0
        quantize(strip, 200).save(os.path.join(OUT, f'prop_{name}.png'), optimize=True)
        table['props'][name] = {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'n': n, 'fps': fps}
        print(f'prop {name}: {n} frames {x1 - x0}x{y1 - y0}, {os.path.getsize(os.path.join(OUT, f"prop_{name}.png")) // 1024} KB')
    for ob in list(bpy.data.objects):
        if ob.get('prop'): bpy.data.objects.remove(ob)


# ------------------------------------------------------------------ SECOND OPINION's heads
def render_heads(table, size=124):
    """His head for SECOND OPINION (the pop-up after a KO in a match), cut out of his own animation frames - HANZ talking
    (grey side to you), then $@L talking (red side) - centred on his eyes, with his pupils drawn in (the game usually
    draws them): heads.png, two size x size frames side by side."""
    out = []
    pup = Image.open(os.path.join(OUT, 'pupils.png')).convert('RGBA')
    for anim, f in (('hanz_talk', 6), ('sal_talk', 2)):
        fr = table['anims'][anim]['frames'][f]
        fn = table['anims'][anim]['sheets'][fr['k']]
        sheet = Image.open(os.path.join(OUT, fn)).convert('RGBA')
        img = Image.new('RGBA', (VW + size, VH + size))
        img.alpha_composite(sheet.crop((fr['sx'], fr['sy'], fr['sx'] + fr['w'], fr['sy'] + fr['h'])), (fr['x'], fr['y']))
        for n, m in table['pupils'].items():
            ex_, ey_, sc, facing = fr['eyes'][n]
            if facing < 0.3: continue
            piece = pup.crop((m['x'], 0, m['x'] + m['w'], m['h']))
            pw, ph = max(1, round(m['w'] * sc / PUPIL_K)), max(1, round(m['h'] * sc / PUPIL_K))
            img.alpha_composite(piece.resize((pw, ph), Image.LANCZOS), (int(round(ex_ - pw / 2)), int(round(ey_ - ph / 2))))
        ex = int((fr['eyes']['sal'][0] + fr['eyes']['hanz'][0]) / 2); ey = int((fr['eyes']['sal'][1] + fr['eyes']['hanz'][1]) / 2)
        y0 = max(0, ey - size // 2 - 22)
        out.append(np.array(img)[y0:y0 + size, ex - size // 2:ex + size // 2])
    quantize(np.concatenate(out, 1), 200).save(os.path.join(OUT, 'heads.png'), optimize=True)


# ------------------------------------------------------------------ main
def drops_for(poses):
    """Blood drops for the heart frames: every so often a drop falls from the heart's bottom and drops to the counter.
    Returns, per frame, the drops' positions (filled in as the frames are built - the heart moves)."""
    return [i for i in range(len(poses)) if poses[i].get('heart', 0) > 0.5 and i % 6 == 3]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--preview', default='')
    ap.add_argument('--samples', type=int, default=SAMPLES); ap.add_argument('--fast', action='store_true')
    a = ap.parse_args()
    global FAST, OUT, TABLE
    if a.fast:                                                                    # (previews only: nothing in the game changes)
        FAST = True; OUT = os.path.join(a.preview or '/tmp', 'fast_out'); TABLE = os.path.join(OUT, 'lostFrames.js'); a.samples = 6
    only = [x for x in a.only.split(',') if x]
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_frame.png')
    cam, mats = setup(a.samples)
    if FAST: bpy.context.scene.render.resolution_percentage = 50
    psheet, pmeta = pupil_sheet(); psheet.save(os.path.join(OUT, 'pupils.png'))
    table = {'pupils': pmeta, 'pupilK': PUPIL_K, 'fps': FPS, 'anims': {}, 'props': {}}
    if os.path.exists(TABLE) and only:
        old = json.loads(open(TABLE).read().split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
        table['anims'] = old.get('anims', {}); table['props'] = old.get('props', {})
        if 'counter' in old: table['counter'] = old['counter']
    # the counter and what stands on it still (him gone, the moving things gone)
    if not only or 'counter' in only:
        for ob in list(bpy.data.objects):
            if ob.get('hanz'): bpy.data.objects.remove(ob)
        desk('show')
        for nm in ('lava', 'hourglass', 'hourglass_glass', 'candle'): bpy.data.objects[nm].hide_render = True
        bpy.context.scene.render.use_border = False
        cimg = shoot(tmp); ccrop, cx, cy = trim(cimg)
        quantize(ccrop).save(os.path.join(OUT, 'counter.png'), optimize=True)
        table['counter'] = [cx, cy]
    if not only or 'props' in only: render_props(cam, mats, tmp, table)
    for name, spec in ANIMS.items():
        if only and name not in only: continue
        poses = spec['frames']()
        crops, info, drops, born = [], [], [], set(drops_for(poses))
        for i, pose in enumerate(poses):
            pose = dict(pose); pose['_t'] = i / FPS
            drops = [(p, v) for p, v in drops if p[2] > 1.2]                       # (a drop reaching the counter is gone)
            img, head_M, bot = render_pose(cam, mats, pose, tmp, [p for p, v in drops])
            clips = clip_check()
            if clips: print(f'  {name} frame {i}: CLIPPING {clips}')
            drops = [((p[0], p[1], p[2] - v), v + 0.55) for p, v in drops]
            if i in born and bot is not None: drops.append(((bot.x, bot.y, bot.z), 0.3))
            crop, x, y = trim(img)
            crops.append(crop); info.append({'x': x, 'y': y, 'eyes': eyes(cam, head_M, pmeta)})
            print(f'  {name} {i + 1}/{len(poses)}', flush=True)
        files = pack(crops, name, info)
        table['anims'][name] = {'loop': bool(spec.get('loop')), 'lazy': bool(spec.get('lazy')), 'sheets': files, 'frames': info}
        print(f'{name}: {len(crops)} frames, sheets {files}, {sum(os.path.getsize(os.path.join(OUT, f)) for f in files) // 1024} KB', flush=True)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            fr = []
            bg = Image.new('RGBA', (VW, VH), (60, 50, 72, 255))
            if os.path.exists(os.path.join(OUT, 'counter.png')): bg.alpha_composite(Image.open(os.path.join(OUT, 'counter.png')).convert('RGBA'), tuple(table['counter']))
            for f, c in zip(info, crops):
                can = bg.copy(); can.alpha_composite(Image.fromarray(c), (f['x'], f['y'])); fr.append(can.convert('RGB'))
            fr[0].save(os.path.join(a.preview, f'{name}.gif'), save_all=True, append_images=fr[1:], duration=1000 // FPS, loop=0)
    if 'hanz_talk' in table['anims'] and 'sal_talk' in table['anims']: render_heads(table)
    with open(TABLE, 'w') as fh:
        fh.write('// HANZ / $@L\'s animations in the LOST room - generated by tools/sprites/hanz_anim.py: do not edit by hand.\n')
        fh.write('// anims[name].frames[i]: x, y = where the frame goes on the 640x360 view; k = which of anims[name].sheets\n')
        fh.write('// (public/assets/shop/lost/) it is on, sx, sy, w, h = where on it; eyes.sal / eyes.hanz = [screen x, screen y, px per\n')
        fh.write('// texel, facing] for the pupils (pupils.png, laid out in `pupils`, drawn pupilK px per texel); lazy = loaded after\n')
        fh.write('// the room opens; counter = where counter.png goes; props = the moving desk things (prop_<name>.png strips).\n')
        fh.write('export const LOST_FRAMES = ' + json.dumps(table, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
