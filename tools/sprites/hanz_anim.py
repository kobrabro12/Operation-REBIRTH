"""HANZ / $@L's animations for the LOST room, rendered in Blender from the model in hanz_3d.py.

Every frame his whole figure is rebuilt from a POSE and rendered through the LOST room's camera (640x360):
  body    hips position + lean (rx) + turn (rz)
  head    yaw / pitch / roll about his neck (yaw > 0 turns his face to the picture's right, showing more of $@L's red
          left half; yaw < 0 shows more of HANZ's grey right half)
  l / r   each arm: where the wrist goes, which way the elbow points (pole), which way the hand points (dir) and the
          back of the hand faces (nrm), and the hand's grip: flat / open / fist / point. The elbow comes from two-bone IK
          (UPPER / FORE), so the arms never stretch. l = $@L's red arm (picture left), r = HANZ's grey arm.
Animations are lists of key poses (KEYS) eased into each other. The counter is a holdout (it cuts him out where it's in
front of him) and is rendered once on its own, so the game draws: room, counter, him.

His PUPILS are not in the face texture: $@L's dripping iris and HANZ's dot are cut out of the drawing (PUPILS) and the
game draws them at the screen spot this script exports per frame (eye centre, how big a texel is there, and whether
the eye faces the camera), nudged toward whatever he's watching - so his eyes track what you're about to buy.

Run:  python3 tools/sprites/hanz_anim.py [--only idle,sal_talk,heads,...] [--preview DIR]
      -> public/assets/shop/lost/hanz_<anim>.png (frames trimmed and packed in a row), counter.png, pupils.png, heads.png
         and src/scenes/lostFrames.js (generated: do not edit by hand)
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
COUNTER = None                                   # the counter rendered on its own (full 640x360), set in main()
CLEAR = 23.5                                     # the counter's back edge (y) - his coat stays behind it below the top
FPS = 12                                         # frames are rendered at 12 a second (the game holds each 5 ticks)

# the pupils, cut out of Mason's face drawing (pixels of hanz_face.png): $@L's dripping iris under his heavy lid
# (rows 19-32, columns 9-23 inside the eye) and HANZ's dot in the middle of his small eye
PUPILS = {'sal': {'rows': (19, 32), 'cols': (9, 23)}, 'hanz': {'rows': (23, 24), 'cols': (41, 42)}}


# ------------------------------------------------------------------ poses
BASE = {
    'body': (0, 42, -4, 38, 0),                 # x, y, z, lean (rx), turn (rz)
    'head': (0, 4, -7),                         # yaw, pitch, roll
    'l': {'w': (-28, -11, 2.9), 'pole': (-1, 0.2, 0.9), 'dir': (0.18, -1, 0), 'nrm': (0, 0, 1), 'grip': 'flat'},
    'r': {'w': (28, -11, 2.9), 'pole': (1, 0.2, 0.9), 'dir': (-0.18, -1, 0), 'nrm': (0, 0, 1), 'grip': 'flat'},
}


def P(body=None, head=None, l=None, r=None):
    """A pose: BASE with some parts changed (arms merge key by key)."""
    p = {'body': body or BASE['body'], 'head': head or BASE['head'], 'l': dict(BASE['l']), 'r': dict(BASE['r'])}
    if l: p['l'].update(l)
    if r: p['r'].update(r)
    return p


def lerp(a, b, t):
    """Blends two poses (numbers and tuples ease; the grip switches halfway)."""
    if isinstance(a, dict): return {k: lerp(a[k], b[k], t) for k in a}
    if isinstance(a, str): return a if t < 0.5 else b
    if isinstance(a, (tuple, list)): return tuple(x + (y - x) * t for x, y in zip(a, b))
    return a + (b - a) * t


def ease(t): return t * t * (3 - 2 * t)


def frames_of(keys):
    """Key poses [(frame, pose, snap?)] -> one pose per frame, eased between keys (snap = jump straight to it)."""
    out = []
    for (f0, p0, *_), (f1, p1, *s1) in zip(keys, keys[1:]):
        for f in range(f0, f1):
            t = (f - f0) / (f1 - f0)
            out.append(p1 if (s1 and s1[0]) else lerp(p0, p1, ease(t)))
    out.append(keys[-1][1])
    return out


def breathe(p, f, n, amt=1.0):
    """Adds a slow breath to a pose (frame f of n): the chest rises and he leans a hair further in."""
    k = math.sin(2 * math.pi * f / n) * amt
    x, y, z, rx, rz = p['body']
    q = dict(p); q['body'] = (x, y, z + 0.6 * k, rx + 1.2 * k, rz)
    return q


# the animations. One-shots end on their last frame; loops wrap. (l = $@L's red arm, r = HANZ's grey arm)
CHIN = {'w': (14, -6, 40), 'pole': (1, -0.6, -1), 'dir': (-0.3, -0.2, 1), 'nrm': (0, -1, 0), 'grip': 'fist'}
POINT = {'w': (-17, -34, 20), 'pole': (-1, -0.2, -1), 'dir': (0.1, -1, 0.15), 'nrm': (0, 0, 1), 'grip': 'point'}
POINT2 = {'w': (-15, -38, 17), 'pole': (-1, -0.2, -1), 'dir': (0.1, -1, 0.05), 'nrm': (0, 0, 1), 'grip': 'point'}
FIST_UP = lambda s: {'w': (s * 22, -14, 30), 'pole': (s, 0.4, -0.2), 'dir': (0, -0.2, 1), 'nrm': (0, -1, 0), 'grip': 'fist'}
FIST_DOWN = lambda s: {'w': (s * 22, -12, 7.5), 'pole': (s, 0.4, 0.9), 'dir': (0, -1, 0), 'nrm': (0, 0, 1), 'grip': 'fist'}
OPEN_WIDE = lambda s: {'w': (s * 52, -16, 26), 'pole': (s, 0.6, -0.6), 'dir': (s * 0.6, -0.5, 0.6), 'nrm': (0, -0.4, -1), 'grip': 'open'}
PALM_UP = lambda s: {'w': (s * 32, -20, 14), 'pole': (s, 0.4, -0.3), 'dir': (s * 0.3, -1, 0.2), 'nrm': (0, 0, -1), 'grip': 'open'}
RUB = lambda dx: ({'w': (-12 + dx, -37, 8), 'pole': (-1, 0.3, -0.5), 'dir': (1, -0.3, 0.1), 'nrm': (0, -1, 0), 'grip': 'flat'},
                  {'w': (12 + dx, -37, 9), 'pole': (1, 0.3, -0.5), 'dir': (-1, -0.3, 0.1), 'nrm': (0, 1, 0), 'grip': 'flat'})
HANZ_HEAD = (-26, 14, -6)                         # HANZ forward: face turned to the left, drooping
SAL_HEAD = (26, -4, 8)                             # $@L forward: face turned to the right, chin up

ANIMS = {
    # idle: too calm - barely moving, breathing; once in the loop his head settles a few degrees further over
    'idle': {'loop': True, 'frames': lambda: [breathe(p, i, 24) for i, p in enumerate(frames_of([
        (0, P()), (12, P(head=(2, 5, -9))), (24, P())]))][:24]},
    # turning to look along the counter (items to his left / right / down in front of him)
    'look_l': {'frames': lambda: frames_of([(0, P()), (6, P(body=(-6, 42, -4, 40, 9), head=(-14, 10, -4)))])},
    'look_r': {'frames': lambda: frames_of([(0, P()), (6, P(body=(6, 42, -4, 40, -9), head=(14, 10, -10)))])},
    'look_d': {'frames': lambda: frames_of([(0, P()), (6, P(body=(0, 40, -6, 46, 0), head=(0, 22, -5)))])},
    # HANZ talking: turns his grey side to you, slumps, props his chin on his grey fist, sighs
    'hanz_talk': {'loop': True, 'frames': lambda: [breathe(p, i, 16, 1.6) for i, p in enumerate(frames_of([
        (0, P(body=(4, 44, -6, 36, -6), head=HANZ_HEAD, r=CHIN)),
        (8, P(body=(4, 44, -7, 35, -7), head=(-24, 18, -8), r=dict(CHIN, w=(14, -6, 38)))),
        (16, P(body=(4, 44, -6, 36, -6), head=HANZ_HEAD, r=CHIN))]))][:16]},
    # $@L talking: turns his red side to you, leans right in and jabs a red finger at you
    'sal_talk': {'loop': True, 'frames': lambda: frames_of([
        (0, P(body=(-4, 40, -3, 44, 7), head=SAL_HEAD, l=POINT)),
        (3, P(body=(-4, 39, -3, 46, 8), head=(28, -6, 10), l=POINT2)),
        (6, P(body=(-4, 40, -3, 44, 7), head=SAL_HEAD, l=POINT)),
        (9, P(body=(-4, 39, -3, 46, 8), head=(24, -2, 6), l=POINT2)),
        (12, P(body=(-4, 40, -3, 44, 7), head=SAL_HEAD, l=POINT))])[:12]},
    # arguing with himself: the head snaps from side to side with no in-between, the hands slam
    'argue': {'loop': True, 'frames': lambda: frames_of([
        (0, P(body=(3, 43, -5, 36, -5), head=(-28, 12, -6), r=FIST_UP(1))),
        (3, P(body=(3, 43, -5, 36, -5), head=(-26, 10, -5), r=FIST_DOWN(1))),
        (4, P(body=(-3, 40, -3, 44, 6), head=(28, -4, 5), l=FIST_UP(-1)), True),
        (7, P(body=(-3, 40, -3, 44, 6), head=(26, -2, 4), l=FIST_DOWN(-1))),
        (8, P(body=(3, 43, -5, 36, -5), head=(-28, 12, -6), r=FIST_UP(1)), True)])[:8]},
    # $@L loses it: both fists up, then down on the counter
    'slam': {'frames': lambda: frames_of([
        (0, P()), (4, P(body=(0, 44, -1, 30, 0), head=(18, -10, 4), l=FIST_UP(-1), r=FIST_UP(1))),
        (6, P(body=(0, 40, -6, 46, 0), head=(20, 8, 4), l=FIST_DOWN(-1), r=FIST_DOWN(1))),
        (10, P(body=(0, 41, -5, 42, 0), head=(16, 6, 0), l=FIST_DOWN(-1), r=FIST_DOWN(1)))])},
    # welcome: rises off the counter and spreads his arms, palms open, head tipped
    'greet': {'frames': lambda: frames_of([
        (0, P()), (6, P(body=(0, 44, 0, 22, 0), head=(0, -6, -14), l=OPEN_WIDE(-1), r=OPEN_WIDE(1))),
        (10, P(body=(0, 44, 1, 20, 0), head=(4, -8, -16), l=OPEN_WIDE(-1), r=OPEN_WIDE(1))),
        (14, P())])},
    # sold! $@L rubs his hands together, leaning in
    'sold': {'loop': True, 'frames': lambda: frames_of([
        (0, P(body=(0, 41, -3, 42, 0), head=(14, 0, 6), l=RUB(0)[0], r=RUB(0)[1])),
        (3, P(body=(0, 41, -3, 42, 0), head=(16, -2, 8), l=RUB(1)[0], r=RUB(-3)[1])),   # (his left hand only slides in a little: further, its sleeve met the collar)
        (6, P(body=(0, 41, -3, 42, 0), head=(14, 0, 6), l=RUB(0)[0], r=RUB(0)[1])),
        (9, P(body=(0, 41, -3, 42, 0), head=(12, 2, 4), l=RUB(-3)[0], r=RUB(3)[1])),
        (12, P(body=(0, 41, -3, 42, 0), head=(14, 0, 6), l=RUB(0)[0], r=RUB(0)[1]))])[:12]},
    # HANZ's sad shrug: shoulders up, palms up, head drops
    'shrug': {'frames': lambda: frames_of([
        (0, P()), (5, P(body=(0, 44, 2, 30, 0), head=(-11, 15, -5), l=PALM_UP(-1), r=PALM_UP(1))),
        (9, P(body=(0, 44, 2, 30, 0), head=(-12, 16, -6), l=PALM_UP(-1), r=PALM_UP(1))),
        (14, P())])},
}


# ------------------------------------------------------------------ building him from a pose
def ik(S, W, pole):
    """Two-bone IK: the elbow for a shoulder S and wrist W (bones UPPER, FORE), bent toward pole. Returns (elbow, wrist)
    - the wrist pulled in if it was out of reach."""
    S, W, pole = np.array(S, float), np.array(W, float), np.array(pole, float)
    d = W - S; L = np.linalg.norm(d); n = d / L
    L = min(L, UPPER + FORE - 0.5); W = S + n * L
    x = (UPPER ** 2 - FORE ** 2 + L ** 2) / (2 * L); h = math.sqrt(max(UPPER ** 2 - x ** 2, 0))
    p = pole - np.dot(pole, n) * n; p /= np.linalg.norm(p)
    return tuple(S + n * x + p * h), tuple(W)


def hand(s, w, d, nrm, grip):
    """A hand at wrist w: fingers along d, the back of the hand facing nrm. grip: 'flat' (lying flat), 'open' (fingers
    spread), 'fist', 'point' (a fist with the index finger out)."""
    m = H.Mesh()
    skin, skin_d = (H.SAL_SKIN, H.SAL_SKIN_D) if s < 0 else (H.HANZ_SKIN, H.HANZ_SKIN_D)
    w, d, nrm = np.array(w, float), np.array(d, float), np.array(nrm, float)
    d /= np.linalg.norm(d); nrm = nrm - np.dot(nrm, d) * d; nrm /= np.linalg.norm(nrm)
    u = np.cross(d, nrm)
    fist = grip in ('fist', 'point')
    plen = 9 if fist else 12
    end = w + d * plen
    m.hull([tuple(p + u * a + nrm * z) for p in (w, end) for a in (-6, 6) for z in (-1.8, 1.8)], skin)
    if fist:
        m.hull([tuple(end + u * a + nrm * z + d * e) for a in (-5.5, 5.5) for z in (-3.5, 1.8) for e in (0, 4.5)], skin_d)   # curled fingers
        m.limb(tuple(w + u * 6 * -s + d * 3 - nrm * 2), tuple(end - nrm * 3.2 + u * 1 * -s), 1.8, 1.6, skin, sides=4)   # the thumb across the fingers
        if grip == 'point':
            m.limb(tuple(end + u * -4 + d * 3), tuple(end + u * -4.5 + d * 16), 1.7, 1.4, skin, sides=4)
    else:
        spread = 0.55 if grip == 'open' else 0.3
        for i, a in enumerate((-4.6, -1.5, 1.5, 4.6)):
            base = end + u * a
            tip = base + d * (12 + (2 if i in (1, 2) else 0)) + u * a * spread - nrm * (0.6 if grip == 'flat' else 0)
            m.limb(tuple(base), tuple(tip), 1.7, 1.4, skin, sides=4)
        m.limb(tuple(w + u * 6 * -s + d * 2), tuple(w + u * 12 * -s + d * 7 - nrm * 0.5), 2.0, 1.6, skin_d, sides=4)
    m.limb(tuple(w - d * 4 + nrm * 0.6), tuple(w + nrm * 0.6), 2.4, 2.4, skin_d, sides=4)   # the wrist out of the cuff
    return m


def sleeve(s, S, E, W, body):
    """A trench-coat sleeve from shoulder S through elbow E, flaring to a strapped cuff short of the wrist W. The
    sloped shoulder pad is built in the body's own space (body = its matrix), so it leans with him."""
    m = H.Mesh()
    x, y, z = s * 24, 0, 41
    m.hull([(x - s * 4, y - 8, z + 4), (x - s * 4, y + 8, z + 4), (x + s * 8, y - 8, z - 3), (x + s * 8, y + 8, z - 3),
            (x - s * 4, y - 7, z - 6), (x - s * 4, y + 7, z - 6), (x + s * 7, y - 7, z - 9), (x + s * 7, y + 7, z - 9)], H.COAT, body)
    m.limb(S, E, 7, 6.5, H.COAT, sides=5, twist=0.4)
    e, w = np.array(E, float), np.array(W, float)
    cuff = e + (w - e) * 0.84
    m.limb(E, tuple(cuff), 6.5, 8, H.COAT2, sides=5, twist=0.2)
    m.limb(tuple(e + (w - e) * 0.68), tuple(e + (w - e) * 0.76), 8.0, 8.2, H.BELT, sides=5, twist=0.2)
    return m


def figure(pose, back=0.0):
    """All of him in a pose: {name: (Mesh, world matrix or None)}; and the head's world matrix. back = how much
    further back to stand (render_pose raises it until his coat clears the counter)."""
    x, y, z, rx, rz = pose['body']
    body = H.T(x, y + back, z, rx=0, rz=rz) @ H.T(rx=rx)
    # leaning further in would push his coat into the counter: slide him back until everything below the counter top
    # is behind its back edge (CLEAR)
    low = [body @ Vector(v) for v in H.coat(Matrix.Identity(4))['torso'].v]
    need = max([CLEAR - p.y for p in low if p.z < 1.5] + [0])
    if need > 0: body = H.T(0, need, 0) @ body
    neck_top = body @ Vector((0, 1, 50))
    yaw, pitch, roll = pose['head']
    head_M = (H.T(*neck_top) @ H.T(rz=yaw) @ H.T(rx=pitch) @ H.T(ry=roll) @ H.T(0, -4, 17) @ Matrix.Scale(H.HEAD_SCALE, 4))
    out = {nm: (m, None) for nm, m in H.coat(body).items()}
    for nm, m in H.head().items(): out[nm] = (m, head_M)
    for s, key, tag in ((-1, 'l', 'sal'), (1, 'r', 'hanz')):
        a = pose[key]
        S = tuple(body @ Vector((s * 24, 0, 41)))
        E, W = ik(S, a['w'], a['pole'])
        out['sleeve_' + tag] = (sleeve(s, S, E, W, body), None)
        out['hand_' + tag] = (hand(s, W, a['dir'], a['nrm'], a['grip']), None)
    return out, head_M


# ------------------------------------------------------------------ rendering
def setup():
    """The scene: materials, ink lines, the counter (built once), the camera. Returns (camera, materials)."""
    H.build('lean')                                                               # (sets up the render settings + materials)
    for ob in list(bpy.data.objects):
        if ob.name not in ('counter', 'bell', 'till', 'watch', 'cam'): bpy.data.objects.remove(ob)
    flat = bpy.data.materials['flat']; face = face_material()
    cam = bpy.data.objects['cam']
    loc, tgt, lens = CAM
    cam.location = loc; cam.data.lens = lens
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc = bpy.context.scene; sc.render.resolution_x = VW; sc.render.resolution_y = VH; sc.render.resolution_percentage = 100
    return cam, flat, face


def face_material():
    """The face material with the pupils cut out of the drawing (the game draws them, so they can move)."""
    src = np.array(Image.open(H.FACE).convert('RGBA'))
    for p in PUPILS.values():
        (r0, r1), (c0, c1) = p['rows'], p['cols']
        src[r0:r1 + 1, c0:c1 + 1, 3] = 0
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_face_nopupils.png'); Image.fromarray(src).save(tmp)
    old = H.FACE; H.FACE = tmp
    try: m = H.material(H.face_image())
    finally: H.FACE = old
    return m


def pupil_sheet():
    """The two pupils as little images (from the drawing): pupils.png = $@L's iris then HANZ's dot, side by side, and
    each one's size and where its middle sits in the drawing."""
    src = np.array(Image.open(H.FACE).convert('RGBA'))
    parts, meta, x = [], {}, 0
    for nm, p in PUPILS.items():
        (r0, r1), (c0, c1) = p['rows'], p['cols']
        im = src[r0:r1 + 1, c0:c1 + 1].copy(); im[im[..., 3] > 0, :3] = (16, 14, 18)
        parts.append(im)
        meta[nm] = {'x': x, 'w': im.shape[1], 'h': im.shape[0], 'cx': (c0 + c1 + 1) / 2, 'cy': (r0 + r1 + 1) / 2}
        x += im.shape[1] + 1
    sheet = np.zeros((max(p.shape[0] for p in parts), x, 4), np.uint8)
    for nm, im in zip(PUPILS, parts): sheet[:im.shape[0], meta[nm]['x']:meta[nm]['x'] + im.shape[1]] = im
    return Image.fromarray(sheet), meta


def texel_to_local(px, py):
    """A pixel of the face drawing -> the point on the front of the head (head space) it's drawn at."""
    x0, x1, z0, z1 = H.FACE_UV
    return Vector((x0 + px / 64 * (x1 - x0), -11.05, z0 + (1 - py / 64) * (z1 - z0)))


def to_screen(cam, p):
    """A world point -> pixel on the 640x360 view."""
    v = world_to_camera_view(bpy.context.scene, cam, p)
    return v.x * VW, (1 - v.y) * VH


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


def render_pose(cam, flat, face, pose, path):
    """Builds him in a pose (standing back as far as he must to clear the counter), renders through the room camera,
    keeps only what's in front of the counter, and returns the image (RGBA array) and his head's matrix."""
    for back in np.arange(0, 30, 0.75):
        for ob in list(bpy.data.objects):
            if ob.get('hanz'): bpy.data.objects.remove(ob)
        parts, head_M = figure(pose, back)
        for nm, (m, M) in parts.items():
            ob = H.to_object(nm, m, [flat, face], face_box=H.FACE_UV if nm == 'face' else None)
            ob['hanz'] = 1
            if M is not None: ob.matrix_world = M
        if not any(c[:2] == ('torso', 'counter') for c in H.clip_check()): break
    for nm in ('counter', 'bell', 'till', 'watch'):
        ob = bpy.data.objects[nm]; ob.is_holdout = False; ob.hide_render = False
    sc = bpy.context.scene; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = crisp(np.array(Image.open(path).convert('RGBA')))
    # rendered WITH the counter (a holdout would let his hidden ink lines draw through it): every pixel that's exactly
    # what the counter alone looks like is the counter, not him - clear it, keeping only what's in front of it
    if COUNTER is not None:
        same = (np.abs(img.astype(int) - COUNTER.astype(int)).max(-1) <= 6) & (COUNTER[..., 3] > 0)
        img[same] = 0
    return img, head_M


def crisp(img):
    """Hard alpha (no half-see-through edge pixels) so it packs to a palette."""
    a = img[..., 3] > 100
    img[~a] = 0; img[a, 3] = 255
    return img


def trim(img):
    """Crops to what's drawn; returns (crop, x, y)."""
    ys, xs = np.nonzero(img[..., 3])
    if not len(xs): return img[:1, :1], 0, 0
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1], int(xs.min()), int(ys.min())


def render_heads(table, size=124):
    """His head for SECOND OPINION (the pop-up after a KO in a match), cut out of his own animation frames - HANZ talking
    (grey side to you), then $@L talking (red side) - centred on his eyes, with his pupils drawn in (the game usually
    draws them): heads.png, two size x size frames side by side."""
    out = []
    pup = np.array(Image.open(os.path.join(OUT, 'pupils.png')).convert('RGBA'))
    for anim, f in (('hanz_talk', 4), ('sal_talk', 1)):
        fr = table['anims'][anim]['frames'][f]
        sheet = np.array(Image.open(os.path.join(OUT, f'hanz_{anim}.png')).convert('RGBA'))
        img = np.zeros((VH + size, VW + size, 4), np.uint8)
        img[fr['y']:fr['y'] + fr['h'], fr['x']:fr['x'] + fr['w']] = sheet[fr['sy']:fr['sy'] + fr['h'], fr['sx']:fr['sx'] + fr['w']]
        for n, m in table['pupils'].items():
            ex_, ey_, sc, facing = fr['eyes'][n]
            if facing < 0.3: continue
            piece = Image.fromarray(pup[:m['h'], m['x']:m['x'] + m['w']])
            pw, ph = max(1, round(m['w'] * sc)), max(1, round(m['h'] * sc))
            piece = np.array(piece.resize((pw, ph), Image.NEAREST))
            x0, y0 = int(round(ex_ - pw / 2)), int(round(ey_ - ph / 2))
            on = piece[..., 3] > 0
            img[y0:y0 + ph, x0:x0 + pw][on] = piece[on]
        ex = int((fr['eyes']['sal'][0] + fr['eyes']['hanz'][0]) / 2); ey = int((fr['eyes']['sal'][1] + fr['eyes']['hanz'][1]) / 2)
        y0 = max(0, ey - size // 2 - 22)
        out.append(img[y0:y0 + size, ex - size // 2:ex + size // 2])
    Image.fromarray(np.concatenate(out, 1)).save(os.path.join(OUT, 'heads.png'))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--preview', default='')
    a = ap.parse_args()
    only = [x for x in a.only.split(',') if x]
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_frame.png')
    cam, flat, face = setup()
    from mathutils.bvhtree import BVHTree
    psheet, pmeta = pupil_sheet(); psheet.save(os.path.join(OUT, 'pupils.png'))
    # the counter on its own
    for ob in list(bpy.data.objects):
        if ob.get('hanz'): bpy.data.objects.remove(ob)
    for nm in ('counter', 'bell', 'till', 'watch'): bpy.data.objects[nm].is_holdout = False
    bpy.context.scene.render.filepath = tmp; bpy.ops.render.render(write_still=True)
    global COUNTER
    cimg = crisp(np.array(Image.open(tmp).convert('RGBA'))); COUNTER = cimg.copy(); ccrop, cx, cy = trim(cimg)
    Image.fromarray(ccrop).save(os.path.join(OUT, 'counter.png'))
    table = {'counter': [cx, cy], 'pupils': pmeta, 'fps': FPS, 'anims': {}}
    if os.path.exists(TABLE) and only:
        old = json.loads(open(TABLE).read().split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
        table['anims'] = old.get('anims', {})
    for name, spec in ANIMS.items():
        if only and name not in only: continue
        poses = spec['frames']()
        crops, info = [], []
        for i, pose in enumerate(poses):
            img, head_M = render_pose(cam, flat, face, pose, tmp)
            clips = H.clip_check()
            if clips: print(f'  {name} frame {i}: CLIPPING {clips}')
            crop, x, y = trim(img)
            crops.append(crop); info.append({'x': x, 'y': y, 'eyes': eyes(cam, head_M, pmeta)})
        # pack the frames in a row (wrapping past 4096 px)
        hmax = max(c.shape[0] for c in crops)
        rows, row, rw = [], [], 0
        for c in crops:
            if rw + c.shape[1] > 4096 and row: rows.append(row); row, rw = [], 0
            row.append(c); rw += c.shape[1] + 1
        rows.append(row)
        W = max(sum(c.shape[1] + 1 for c in r) for r in rows); Hh = (hmax + 1) * len(rows)
        sheet = np.zeros((Hh, W, 4), np.uint8); k = 0
        for ri, r in enumerate(rows):
            xx = 0
            for c in r:
                sheet[ri * (hmax + 1):ri * (hmax + 1) + c.shape[0], xx:xx + c.shape[1]] = c
                info[k].update({'sx': xx, 'sy': ri * (hmax + 1), 'w': c.shape[1], 'h': c.shape[0]}); k += 1; xx += c.shape[1] + 1
        im = Image.fromarray(sheet)
        q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pal = q.convert('RGBA'); arr = np.array(pal); arr[..., 3] = sheet[..., 3]; arr[sheet[..., 3] == 0] = 0
        Image.fromarray(arr).save(os.path.join(OUT, f'hanz_{name}.png'), optimize=True)
        table['anims'][name] = {'loop': bool(spec.get('loop')), 'frames': info}
        print(f'{name}: {len(crops)} frames, sheet {W}x{Hh}, {os.path.getsize(os.path.join(OUT, f"hanz_{name}.png")) // 1024} KB')
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            fr = []
            for f, c in zip(info, crops):
                can = Image.new('RGBA', (VW, VH), (46, 40, 58, 255))
                can.alpha_composite(Image.fromarray(ccrop), (cx, cy)); can.alpha_composite(Image.fromarray(c), (f['x'], f['y']))
                fr.append(can.convert('RGB'))
            fr[0].save(os.path.join(a.preview, f'{name}.gif'), save_all=True, append_images=fr[1:], duration=1000 // FPS, loop=0)
    render_heads(table)
    with open(TABLE, 'w') as fh:
        fh.write('// HANZ / $@L\'s animations in the LOST room - generated by tools/sprites/hanz_anim.py: do not edit by hand.\n')
        fh.write('// anims[name].frames[i]: x, y = where the frame goes on the 640x360 view; sx, sy, w, h = where it is on its sheet\n')
        fh.write('// (public/assets/shop/lost/hanz_<name>.png); eyes.sal / eyes.hanz = [screen x, screen y, px per texel, facing] for the\n')
        fh.write('// pupils (pupils.png, laid out in `pupils`); counter = where counter.png goes.\n')
        fh.write('export const LOST_FRAMES = ' + json.dumps(table, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
