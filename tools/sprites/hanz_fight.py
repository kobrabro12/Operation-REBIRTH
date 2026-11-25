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
FIGHT = ['idle', 'look_d', 'sal_talk', 'hanz_talk', 'laugh', 'slam', 'argue', 'twitch', 'glitch', 'pitch', 'clap', 'snap', 'raise']
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


ANIMS = dict(A.ANIMS)
ANIMS['raise'] = {'frames': raise_frames}


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


def upright(pose):
    """His LOST pose straightened up out of its lean over the counter (`LEAN`): his body turns upright round his hips
    and everything placed in the room - his hands, which way they point, their bend - turns with it, so the pose keeps
    its shape. Returns the new pose."""
    p = dict(pose); x, y, z, rx, rz = p['body']
    old = A.body_matrix(pose, 0.0)
    p['body'] = (x, y, z, max(4, rx - LEAN), rz)
    T = A.body_matrix(p, 0.0) @ old.inverted(); R = T.to_3x3()
    for k in ('l', 'r'):
        a = dict(p[k])
        if a.get('w') is not None: a['w'] = tuple(T @ Vector(a['w']))
        for d in ('dir', 'nrm', 'pole'):
            if a.get(d) is not None and a.get('b', 0) + a.get('h', 0) < 0.999: a[d] = tuple(R @ Vector(a[d]))
        p[k] = a
    return p


def hang(body, f):
    """His legs as he floats, frame f of the swing loop (hanz_legs.N frames): each hangs from his hip under his coat,
    knees a touch bent and forward, feet a little in front, swinging gently out of step, toes drooping. Returns
    {'leg_sal': ..., 'leg_hanz': ...}."""
    out = {}; t = 2 * math.pi * f / G.N
    for s, tag, ph in ((-1, 'sal', 0.0), (1, 'hanz', 2.2)):
        hip = np.array(body @ Vector((s * A.HIP[0], A.HIP[1], A.HIP[2])))
        th, sh = A.THIGH * G.LONG, A.SHIN * G.LONG; L = (th + sh) * HANG['reach']
        ankle = hip + np.array((s * HANG['apart'] + HANG['swing'][0] * math.sin(t + ph) * 0.6, HANG['fwd'] + HANG['swing'][1] * math.sin(t + ph), -L))
        knee, ankle = A.ik(hip, ankle, (s * 0.08, -1, 0.15), th, sh)
        droop = 0.15 * math.sin(t + ph + 0.8)
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


def render(cam, mats, pose, i, tmp):
    """Him whole in a pose with his legs hanging (frame i of their swing), lit, snapped and rendered with no desk;
    returns (RGBA, the mask's matrix)."""
    parts, mask_M, bot = A.figure(pose, 0.0)
    parts.update(hang(A.body_matrix(pose, 0.0), i % G.N))
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
        poses = A.settle_collar([upright(q) for q in spec['frames']()], mats, spec.get('loop'))
        crops, info, spark = [], [], None
        for i, pose in enumerate(poses):
            pose = dict(pose); pose['_t'] = i / A.FPS
            img, mask_M = render(cam, mats, pose, i, tmp)
            crop, x, y = A.trim(img)
            ey = A.eyes(cam, mask_M, pmeta)
            if pose.get('glitch', 0) > 0.2: ey = {k: v[:3] + [0] for k, v in ey.items()}
            crops.append(crop); info.append({'x': x * A.SCALE, 'y': (y - TOP) * A.SCALE, 'eyes': ey})
            if name == 'snap' and i == math.ceil(A.SNAP_T * A.FPS): spark = [round(v) for v in to_screen(cam, Vector(A.TIPS['sal']))]
            if name == 'clap' and i == math.ceil(A.CLAP_T * A.FPS): spark = [round(v) for v in to_screen(cam, Vector((A.TIPS['sal'] + A.TIPS['hanz']) / 2))]
            print(f'  {view} {name} {i + 1}/{len(poses)}', flush=True)
        files = A.pack(crops, f'{view}_{name}', info)
        entry = {'loop': bool(spec.get('loop')), 'sheets': files, 'frames': info}
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
