"""HANZ / $@L as he FIGHTS (his boss fight, HIS DESK): the same PS1 man as in the LOST room (hanz_anim.py's model, poses
and animations), but whole - legs and all, no counter in front of him - and turned to the SIDE, the way a fighter
stands: the room camera swung round him `TURN` degrees one way (`r`: he faces right, his red $@L side toward you) and
the other (`l`: he faces left, HANZ's grey side toward you). A frame's place (y may be negative: over the top) is on the same 640-wide picture as his
LOST frames (the camera keeps its height and tilt, so a point at his waist lands on the same row), the view stretched
`EXTRA` rows downward for his legs.

His legs hang and swing as he floats (hanz_legs.py's `hang`, its own loop running through every animation).
`FIGHT` = the animations he fights with (each `TURNS` both ways); `FRONT` = ones rendered facing you, legs and all
(his hands-up STARFALL `raise`, new here).

Run:  python3 tools/sprites/hanz_fight.py [--only idle,raise] [--views r,l,f] [--preview DIR]   (--mask: just mask_halves.png)
      -> public/assets/shop/lost/hanz_<r|l|f>_<anim>[_<k>].png + `fight` in src/scenes/lostFrames.js:
         fight[view][anim] = { loop, sheets, frames: [{ x, y, k, sx, sy, w, h, eyes }], spark? } like LOST_FRAMES.anims
Needs bpy and imagequant. ~1 s a frame; all of it ~25 minutes.
"""
import os, sys, math, json, argparse
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import hanz_anim as A
import hanz_3d as H
import hanz_legs as G
import bpy
from mathutils import Vector

TURN = 40                                        # how far the camera swings round him for his side views (degrees)
EXTRA = 200                                      # render rows added under the LOST view's 180 (his legs)
TOP = 50                                         # ...and over it (his hands raised over his head)
AXIS = (0, 40)                                   # the upright line the camera swings round (x, y: through his body)
# the animations he fights with, rendered turned both ways
FIGHT = ['idle', 'look_d', 'sal_talk', 'hanz_talk', 'laugh', 'slam', 'argue', 'twitch', 'glitch', 'pitch', 'clap', 'snap', 'raise', 'spear']
TURNS = {'r': -TURN, 'l': TURN}
# ...and facing you, whole: THE STARFALL, and everything the fight shows facing you (cutscenes, his death, his gloat)
FRONT = ['raise', 'idle', 'slam', 'clap', 'pitch', 'snap', 'laugh', 'unmask', 'twitch', 'sal_talk', 'sob', 'glitch', 'heart', 'switch', 'shrug', 'sold']
LEAN = 28                                        # degrees of his lean over the LOST counter taken out (there's no counter here: he floats upright)
TROUSER = 0x24242d                               # his trousers here: a shade off his coat, so his legs read as part of the same dark suit
# his legs hanging: how far forward his feet sit (y), how far apart (x), how much of their length they hang (the rest
# bends the knees), and how far they swing (side to side, back and forth)
HANG = {'fwd': -7.0, 'apart': 2.5, 'reach': 0.9, 'swing': (2.0, 4.0)}


def raise_frames():
    """THE STARFALL: he straightens up out of his lean, lifts his hands off nothing, and raises both arms high and
    wide, palms to the sky, fingers spread, head tipped right back - and holds it, arms trembling, as the stars come
    down. 2.4 s; the game holds the last frames."""
    up = lambda s, k=0.0: A.arm(wb=(s * (42 + k), -10, 86 + k), b=1.0, pole=(s, 0.3, -0.4), dir=(s * 0.25, -0.2, 1), nrm=(0, -0.6, 0.6), grip='open', spread=0.9)
    return A.follow(A.frames_of([
        (0, A.P()),
        (0.35, A.P(body=(0, 41, -6, 42, 0), head=(0, 12, -2), l=A.LIFT(-1), r=A.LIFT(1)), 'io'),
        (0.8, A.P(body=(0, 44, 0, 18, 0), head=(0, -6, 0), l=A.RAISE(-1), r=A.RAISE(1)), 'io'),
        (1.3, A.P(body=(0, 45, 3, 6, 0), head=(0, -26, 0), l=up(-1, 2), r=up(1, 2)), 'back'),
        (1.8, A.P(body=(0, 45, 3.4, 5, 0), head=(3, -28, 2), l=up(-1, 0.5), r=up(1, 0.5))),
        (2.4, A.P(body=(0, 45, 3.2, 5.5, 0), head=(-3, -27, -2), l=up(-1, 1.5), r=up(1, 1.5)))]), 0.6)


def spear_frames():
    """THE SPEAR OF LIGHT: $@L's red hand goes up and a spear of light forms in it (the game draws the spear at the
    hand - `hand` in each frame), he grips it, cocks it back over his shoulder with HANZ's grey hand pointing the way,
    twisting away to wind up - held while he aims (`SPEAR_AIM`: the game holds that frame) - then whips it forward,
    his whole body lunging after it, and recovers. 2.6 s."""
    W = lambda s, x, y, z, grip='fist', **k: A.arm(wb=(s * x, y, z), b=1.0, grip=grip, **k)
    up = W(-1, 24, 8, 80, 'open', pole=(-1, 0.4, -0.3), dir=(0, -0.2, 1), nrm=(1, 0, 0))
    hold = W(-1, 26, 10, 78, pole=(-1, 0.4, -0.3), dir=(0, -0.3, 1), nrm=(1, 0, 0))
    cock = W(-1, 30, 26, 64, pole=(-1, 0.8, -0.2), dir=(0, -1, 0.2), nrm=(1, 0, 0))
    point = W(1, 18, -46, 48, 'point', pole=(1, 0.2, -0.5), dir=(0, -1, 0.1), nrm=(0, 0, 1))
    throw = W(-1, 12, -50, 38, 'open', pole=(-1, -0.2, 0.6), dir=(0.1, -1, -0.2), nrm=(0, 0, -1))
    tuck = W(1, 22, 6, 22, pole=(1, 0.3, 0.6), dir=(0, -0.5, 0.2))
    return A.follow(A.frames_of([
        (0, A.P()),
        (0.35, A.P(body=(0, 44, -2, 32, 6), head=(-6, -12, 4), l=up), 'out'),
        (0.65, A.P(body=(0, 44, -2, 31, 8), head=(-8, -10, 4), l=hold), 'io'),
        (1.0, A.P(body=(0, 46, -1, 28, -22), head=(14, 2, -4), l=cock, r=point), 'io'),
        (1.6, A.P(body=(0, 46, -1, 27, -24), head=(16, 3, -4), l=cock, r=point)),
        (1.78, A.P(body=(0, 38, -5, 54, 26), head=(10, 10, 6), l=throw, r=tuck), 'snap'),
        (2.0, A.P(body=(0, 39, -5, 50, 22), head=(8, 8, 4), l=throw, r=tuck), 'out'),
        (2.6, A.P(), 'io')]), 0.7)


SPEAR_AIM = 1.3                                  # when (s) the game holds THE SPEAR OF LIGHT while he aims
SPEAR_GO = 1.72                                  # when (s) it leaves his hand


ANIMS = dict(A.ANIMS)
ANIMS['raise'] = {'frames': raise_frames}
ANIMS['spear'] = {'frames': spear_frames}

# HOW HE MOVES, per animation, so he never hangs there stiff: his legs (`sw` = swing side to side / back and forth,
# `cyc` = swings over the clip, `alt` = legs swing against each other, `reach` = how much of their length they hang,
# `fwd` / `apart` = where his feet sit, `kicks` = (from, to, which leg: -1 red / 1 grey / 0 both, forward, up) as
# fractions of the clip, `tuck` = (from, to, reach, forward) knees pulled up, `jit` = jitter) and his body (`sway` =
# lean, twist (degrees), cycles over the clip). On top of all of it his feet trail behind his hips as they move.
MOTION = {
    'idle': dict(sw=(2.5, 6), cyc=2, alt=True, sway=(3, 5, 1)),
    'look_d': dict(sw=(1, 3), kicks=[(0.2, 1.0, 0, 6, 5)], sway=(2, 0, 1)),
    'sal_talk': dict(sw=(3, 6), cyc=2, kicks=[(0.05, 0.4, -1, -12, 6), (0.55, 0.9, -1, -12, 6)], sway=(4, 4, 2)),
    'hanz_talk': dict(sw=(1, 2.5), reach=0.95, sway=(2, 3, 1)),
    'laugh': dict(sw=(2, 3), cyc=4, kicks=[(i / 8, (i + 1) / 8, 1 if i % 2 else -1, -15, 9) for i in range(8)], sway=(5, 6, 4)),
    'slam': dict(tuck=[(0.0, 0.5, 0.55, -12)], kicks=[(0.48, 0.75, 0, 5, -4)], sway=(0, 4, 1)),
    'argue': dict(sw=(2, 3), cyc=2, kicks=[(0.0, 0.45, 1, -11, 7), (0.45, 0.95, -1, -11, 7)], sway=(3, 6, 2)),
    'twitch': dict(sw=(1, 2), jit=4),
    'glitch': dict(jit=8, sway=(4, 10, 3)),
    'pitch': dict(kicks=[(0.1, 0.45, -1, -7, 5), (0.1, 0.45, 1, -7, 5), (0.55, 0.95, 1, -15, 12)], sway=(4, 8, 1)),
    'clap': dict(sw=(2, 4), cyc=2, kicks=[(0.45, 0.75, 0, -11, 7)], sway=(3, 3, 1)),
    'snap': dict(sw=(2, 4), cyc=2, kicks=[(0.5, 0.8, -1, -13, 9)], sway=(3, 5, 1)),
    'raise': dict(apart=6, reach=0.96, sw=(1, 1.5), cyc=3, jit=0.6, sway=(1.5, 2, 2)),
    'sob': dict(tuck=[(0.05, 0.85, 0.5, -16)], apart=0.5, jit=0.8, sway=(3, 2, 3)),
    'heart': dict(sw=(1.5, 2.5), cyc=2, reach=0.93, sway=(2, 3, 1)),
    'switch': dict(sw=(4, 6), cyc=3, alt=True, sway=(3, 6, 2)),
    'shrug': dict(tuck=[(0.15, 0.75, 0.75, -7)], sway=(2, 3, 1)),
    'sold': dict(kicks=[(i / 6, (i + 1) / 6, 1 if i % 2 else -1, -11, 7) for i in range(6)], sway=(3, 4, 2)),
    'unmask': dict(sw=(1.5, 2.5), cyc=2, sway=(2, 3, 1)),
    'spear': dict(tuck=[(0.32, 0.64, 0.8, 7)], kicks=[(0.66, 0.92, 0, 12, 8)], sway=(2, 0, 1)),
}
LAG = (3.0, 0.72)                                # his feet trailing his hips: how far (x hip movement), how slowly they catch up


def motion(name, poses, loop):
    """How his legs and body move through a clip (MOTION): per frame, each foot's place (from its hip, in the world)
    and how much his body leans / twists on top of the pose. Feet trail his hips' own movement. Returns (feet, sway):
    feet[i] = {-1: (dx, dy, dz, reach), 1: ...}, sway[i] = (lean, twist)."""
    M = MOTION.get(name, {}); n = len(poses)
    sw, cyc, alt = M.get('sw', (2, 4)), M.get('cyc', 1), M.get('alt', False)
    lean, twist, scyc = M.get('sway', (2, 3, 1))
    rng = np.random.default_rng(len(name) * 97 + n)
    hips = [np.array(A.body_matrix(p, 0.0) @ Vector((0, A.HIP[1], A.HIP[2]))) for p in poses]
    env = lambda u, a, b: math.sin(math.pi * (u - a) / (b - a)) if a <= u <= b else 0.0
    lag = np.zeros(3); feet, sway = [], []
    for rnd in range(2 if loop else 1):                                          # (a loop runs twice so its trail joins up)
        feet, sway = [], []
        for i in range(n):
            u = i / max(1, n - 1) if not loop else i / n
            d = hips[i] - hips[i - 1] if (i or loop) else np.zeros(3)
            lag = lag * LAG[1] - d * LAG[0] * (1 - LAG[1])
            fr = {}
            for s, ph in ((-1, 0.0), (1, math.pi if alt else 2.2)):
                q = 2 * math.pi * cyc * u + ph
                dx = s * M.get('apart', HANG['apart']) + sw[0] * math.sin(q) * 0.6 + lag[0]
                dy = M.get('fwd', HANG['fwd']) + sw[1] * math.sin(q) + lag[1]
                dz = lag[2] * 0.5; reach = M.get('reach', HANG['reach'])
                for a, b, leg, f, up in M.get('kicks', []):
                    if leg in (0, s): e = env(u, a, b); dy += f * e; dz += up * e
                for a, b, r, f in M.get('tuck', []):
                    e = min(1.0, 2.2 * env(u, a, b)); reach = reach + (r - reach) * e; dy += f * e
                if M.get('jit'): dx += rng.normal() * M['jit']; dy += rng.normal() * M['jit']
                fr[s] = (dx, dy, dz, reach)
            feet.append(fr)
            k = math.sin(math.pi * u) if not loop else 1.0
            sway.append((lean * math.sin(2 * math.pi * scyc * u) * k, twist * math.sin(2 * math.pi * scyc * u + 1.1) * k))
    return feet, sway


def mask_halves():
    """THE TRUE FACE's two mask halves (his mask breaks in two when the stars fall, and the halves fly round him):
    Mason's face drawing on a rounded plate, $@L's red left of the split and HANZ's grey right, broken apart along a
    jagged crack, each with a dark rim. Writes mask_halves.png: two 64x64 frames (red half, grey half), each half
    where it sits on the whole mask."""
    src = np.array(Image.open(H.FACE).convert('RGBA'))
    yy, xx = np.mgrid[0:64, 0:64]
    plate = ((xx - 31.5) / 31) ** 4 + ((yy - 30) / 29) ** 4 <= 1                      # a rounded square plate
    crack = H.FACE_SPLIT + np.round(2.2 * np.sin(yy * 1.3) + 1.2 * np.sin(yy * 3.1 + 1)).astype(int)
    out = np.zeros((64, 128, 4), np.uint8)
    for k, (side, skin) in enumerate(((xx < crack, H.SAL_SKIN), (xx >= crack, H.HANZ_SKIN))):
        m = plate & side
        img = np.zeros((64, 64, 4), np.uint8)
        img[m, :3] = [skin >> 16 & 255, skin >> 8 & 255, skin & 255]; img[m, 3] = 255
        img[m & (src[..., 3] > 0), :3] = (16, 14, 18)
        rim = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        img[rim, :3] = (20, 12, 16)
        out[:, k * 64:(k + 1) * 64] = img
    Image.fromarray(out).save(os.path.join(A.OUT, 'mask_halves.png'), optimize=True)


def upright(pose, sway=(0.0, 0.0)):
    """His LOST pose straightened up out of its lean over the counter (`LEAN`), plus a little lean / twist on top
    (`sway`, degrees - motion()): his body turns round his hips and everything placed in the room - his hands, which
    way they point, their bend - turns with it, so the pose keeps its shape. Returns the new pose."""
    p = dict(pose); x, y, z, rx, rz = p['body']
    old = A.body_matrix(pose, 0.0)
    p['body'] = (x, y, z, max(2, rx - LEAN + sway[0]), rz + sway[1])
    T = A.body_matrix(p, 0.0) @ old.inverted(); R = T.to_3x3()
    for k in ('l', 'r'):
        a = dict(p[k])
        if a.get('w') is not None: a['w'] = tuple(T @ Vector(a['w']))
        for d in ('dir', 'nrm', 'pole'):
            if a.get(d) is not None: a[d] = tuple(R @ Vector(a[d]))                 # (P() keeps every direction in the room's frame)
        p[k] = a
    return p


def hang(body, f, feet=None):
    """His legs as he floats: each hangs from his hip under his coat, knees a touch bent and forward, toes drooping -
    where each foot goes this frame (`feet`, from motion(): offsets from the hip and how much of the leg's length
    hangs; else a plain swing at frame f of hanz_legs.N). Returns {'leg_sal': ..., 'leg_hanz': ...}."""
    out = {}; t = 2 * math.pi * f / G.N
    for s, tag, ph in ((-1, 'sal', 0.0), (1, 'hanz', 2.2)):
        hip = np.array(body @ Vector((s * A.HIP[0], A.HIP[1], A.HIP[2])))
        th, sh = A.THIGH * G.LONG, A.SHIN * G.LONG
        if feet: dx, dy, dz, reach = feet[s]
        else: dx, dy, dz, reach = s * HANG['apart'] + HANG['swing'][0] * math.sin(t + ph) * 0.6, HANG['fwd'] + HANG['swing'][1] * math.sin(t + ph), 0.0, HANG['reach']
        ankle = hip + np.array((dx, dy, -(th + sh) * reach + dz))
        knee, ankle = A.ik(hip, ankle, (s * 0.08, -1, 0.15), th, sh)
        droop = 0.15 * math.sin(t + ph + 0.8) + 0.02 * dy
        toe = np.array((s * 0.1, -0.5 - droop, -0.86)); up = np.array((0, -0.86, 0.5 - droop))
        out['leg_' + tag] = (H.leg(s, tuple(hip), tuple(knee), tuple(ankle), tuple(toe), tuple(up)), None)
    return out


def aim(cam, deg):
    """Swings the room camera deg degrees round AXIS (same height, same tilt), so he's seen turned."""
    loc, tgt, lens = A.CAM
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    rot = lambda p: Vector((AXIS[0] + (p[0] - AXIS[0]) * c - (p[1] - AXIS[1]) * s, AXIS[1] + (p[0] - AXIS[0]) * s + (p[1] - AXIS[1]) * c, p[2]))
    cam.location = rot(loc)
    cam.rotation_euler = (rot(tgt) - rot(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()


def to_screen(cam, p):
    """A world point -> its place on the 640-wide picture (the stretched view: rows past 360 are below the LOST view)."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    v = world_to_camera_view(sc, cam, Vector(p))
    return v.x * A.VW, ((1 - v.y) * sc.render.resolution_y - TOP) * A.SCALE


def render(cam, mats, pose, i, tmp, feet=None):
    """Him whole in a pose with his legs hanging (frame i of their swing), lit, snapped and rendered with no desk;
    returns (RGBA, the mask's matrix)."""
    parts, mask_M, bot = A.figure(pose, 0.0)
    parts.update(hang(A.body_matrix(pose, 0.0), i % G.N, feet))
    obs = A.place(parts, mats, cam)
    bpy.context.scene.render.use_border = False
    img = A.clean(A.shoot(tmp))
    g = pose.get('glitch', 0)
    return A.glitch_2d(A.sharp_face(img, obs, tmp), g, int(round(pose.get('_t', 0) * A.FPS)) * 31 + 7), mask_M


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--views', default='r,l,f'); ap.add_argument('--preview', default='')
    ap.add_argument('--mask', action='store_true')
    a = ap.parse_args()
    if a.mask: mask_halves(); return
    only = [x for x in a.only.split(',') if x]
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_fight.png')
    H.LOOK['shoe'] = (G.SHINE,) + tuple(H.LOOK['shoe'][1:]); H.SHOE_SAL, H.SHOE_HANZ = G.SHOES; H.TROUSER = TROUSER
    A.to_screen = to_screen                                                       # (eyes() and the sparks use it)
    cam, mats = A.setup()
    A.desk('hide')
    sc = bpy.context.scene; cam.data.sensor_fit = 'HORIZONTAL'
    sc.render.resolution_y = H.RES[1] + EXTRA + TOP; cam.data.shift_y = -((EXTRA - TOP) / 2) / H.RES[0]
    psheet, pmeta = A.pupil_sheet()
    src = open(A.TABLE).read()
    table = json.loads(src.split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
    fight = table.get('fight', {})
    jobs = [(v, n) for v in a.views.split(',') for n in (FIGHT if v in TURNS else FRONT) if not only or n in only]
    for view, name in jobs:
        aim(cam, TURNS.get(view, 0))
        spec = ANIMS[name]
        raw = spec['frames'](); feet, sway = motion(name, raw, spec.get('loop'))
        poses = A.settle_collar([upright(q, w) for q, w in zip(raw, sway)], mats, spec.get('loop'))
        crops, info, spark = [], [], None
        for i, pose in enumerate(poses):
            pose = dict(pose); pose['_t'] = i / A.FPS
            img, mask_M = render(cam, mats, pose, i, tmp, feet[i])
            crop, x, y = A.trim(img)
            ey = A.eyes(cam, mask_M, pmeta)
            if pose.get('glitch', 0) > 0.2: ey = {k: v[:3] + [0] for k, v in ey.items()}
            crops.append(crop); info.append({'x': x * A.SCALE, 'y': (y - TOP) * A.SCALE, 'eyes': ey})
            if name == 'spear': info[-1]['hand'] = [round(v) for v in to_screen(cam, Vector(A.TIPS['sal']))]   # (where the game draws the spear)
            if name == 'snap' and i == math.ceil(A.SNAP_T * A.FPS): spark = [round(v) for v in to_screen(cam, Vector(A.TIPS['sal']))]
            if name == 'clap' and i == math.ceil(A.CLAP_T * A.FPS): spark = [round(v) for v in to_screen(cam, Vector((A.TIPS['sal'] + A.TIPS['hanz']) / 2))]
            print(f'  {view} {name} {i + 1}/{len(poses)}', flush=True)
        files = A.pack(crops, f'{view}_{name}', info)
        entry = {'loop': bool(spec.get('loop')), 'sheets': files, 'frames': info}
        if name == 'spear': entry['aim'] = round(SPEAR_AIM * A.FPS); entry['go'] = round(SPEAR_GO * A.FPS)
        if spark: entry['spark'] = {'f': math.ceil((A.SNAP_T if name == 'snap' else A.CLAP_T) * A.FPS), 'x': spark[0], 'y': spark[1]}
        fight.setdefault(view, {})[name] = entry
        print(f'{view} {name}: {len(crops)} frames, {sum(os.path.getsize(os.path.join(A.OUT, f)) for f in files) // 1024} KB', flush=True)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True); fr = []
            for f, c in zip(info, crops):
                can = Image.new('RGBA', (A.VW, A.VH + (EXTRA + TOP) * 2), (60, 50, 72, 255)); im = Image.fromarray(c)
                can.alpha_composite(im.resize((im.width * 2, im.height * 2), Image.NEAREST), (f['x'], f['y'] + TOP * 2)); fr.append(can.convert('RGB'))
            fr[0].save(os.path.join(a.preview, f'{view}_{name}.gif'), save_all=True, append_images=fr[1:], duration=1000 // A.FPS, loop=0)
        # (written after every animation, so a long run that stops keeps what it finished)
        src = open(A.TABLE).read()                                                # (re-read: another run may have written its own since)
        table = json.loads(src.split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
        table.setdefault('fight', {}).setdefault(view, {})[name] = entry
        head = src.split('export const LOST_FRAMES = ', 1)[0]
        if '// fight =' not in head: head = head.rstrip('\n') + '\n// fight = him whole, turned to the side (r / l) or facing you (f), for his boss fight (hanz_fight.py).\n'
        with open(A.TABLE, 'w') as fh: fh.write(head + 'export const LOST_FRAMES = ' + json.dumps(table, separators=(',', ':')) + ';\n')
        src = open(A.TABLE).read()


if __name__ == '__main__':
    main()
