"""HANZ / $@L's LEGS for his boss fight (HIS DESK): in the LOST room his counter hides everything below his waist, but
in the fight he floats on the stage with you, so this renders the rest of him - the bottom of his coat, his long legs
in noir trousers, one red shoe and one grey - dangling and swaying, in the same PS1 look and through the same camera
as his animations (hanz_anim.py), so it lines up under every frame of them.

How: he's posed as in his idle (same body, same step back from the counter) with his legs hanging (`hang`), rendered
twice through the room camera with the view stretched downward (`EXTRA` rows, the top rows unchanged): once with the
counter gone, once with it cutting him out like his animation frames. What the counter hid (plus `OVERLAP` rows up
behind his frames, so no gap shows) is the legs layer. A looping swing of `N` frames.

Run:  python3 tools/sprites/hanz_legs.py [--preview DIR]
      -> public/assets/shop/lost/hanz_legs.png + `legs` in src/scenes/lostFrames.js (frames like an animation's:
         x, y on the 640x360 LOST picture - y may run past 360 - and k, sx, sy, w, h on the sheet)
Needs bpy and imagequant, like hanz_anim.py. ~1 minute.
"""
import os, sys, math, json, argparse
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import hanz_anim as A
import hanz_3d as H
import bpy
from mathutils import Vector

N = 30                                           # frames in the swing loop (15 a second: two seconds)
EXTRA = 180                                      # render rows added under the 180 of the LOST view (his feet hang below it)
OVERLAP = 4                                      # rows of him above the counter's cut kept in the legs layer (drawn behind his frames)
HANG = 0.93                                      # how straight his legs hang (ankle distance from the hip / leg length)
SWING = (3.5, 5.0)                               # how far his ankles swing (side to side, back and forth)
LONG = 1.25                                      # his legs here are this much longer than hanz_anim's THIGH / SHIN (he's lanky, and taller in the fight)
SHINE = 0.0                                      # the shoes' fake highlight (hanz_3d LOOK['shoe'] is 0.55: seen from above, toes down, it washed the red out)
SHOES = (0x6a0610, 0x9a9894)                     # the shoes' colours here (a shade deeper than hanz_3d's, for the same reason)


def hang(body, f):
    """His legs dangling at frame f of N: each hangs from its hip, knees a little forward, ankles swinging slowly out of
    step with each other, toes drooping. Returns {'leg_sal': ..., 'leg_hanz': ...}."""
    out = {}
    t = 2 * math.pi * f / N
    for s, tag, ph in ((-1, 'sal', 0.0), (1, 'hanz', 2.2)):
        hip = np.array(body @ Vector((s * A.HIP[0], A.HIP[1], A.HIP[2])))
        th, sh = A.THIGH * LONG, A.SHIN * LONG; L = (th + sh) * HANG
        ankle = hip + np.array((s * 3.0 + SWING[0] * math.sin(t + ph) * 0.6, -4.0 + SWING[1] * math.sin(t + ph), -L))
        knee, ankle = A.ik(hip, ankle, (s * 0.1, -1, 0.2), th, sh)
        droop = 0.15 * math.sin(t + ph + 0.8)
        toe = np.array((s * 0.12, -0.55 - droop, -0.85))
        up = np.array((0, -0.85, 0.55 - droop))
        out['leg_' + tag] = (H.leg(s, tuple(hip), tuple(knee), tuple(ankle), tuple(toe), tuple(up)), None)
    return out


def stretch(on):
    """Stretches the render EXTRA rows downward (same lens across, the top 180 rows exactly as before) - or back."""
    sc = bpy.context.scene; cam = sc.camera.data
    cam.sensor_fit = 'HORIZONTAL'
    sc.render.resolution_y = H.RES[1] + (EXTRA if on else 0)
    cam.shift_y = -(EXTRA / 2) / H.RES[0] if on else 0.0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--preview', default='')
    a = ap.parse_args()
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_legs.png')
    H.LOOK['shoe'] = (SHINE,) + tuple(H.LOOK['shoe'][1:])
    H.SHOE_SAL, H.SHOE_HANZ = SHOES
    cam, mats = A.setup()
    pose = dict(A.ANIMS['idle']['frames']()[0])
    back = 0.0
    for back in np.arange(0, 30, 0.75):                                           # (stands as far back as his idle does)
        parts, mm, bot = A.figure(pose, back); A.place(parts, mats)
        if not any(c[:2] == ('torso', 'counter') for c in A.clip_check()): break
    stretch(True)
    bpy.context.scene.render.use_border = False
    crops, info = [], []
    for f in range(N):
        parts, mm, bot = A.figure(pose, back)
        parts.update(hang(A.body_matrix(pose, back), f))
        A.place(parts, mats, cam)
        A.desk('hide'); full = A.shoot(tmp)
        A.desk('cut'); cut = A.shoot(tmp)
        seen = cut[..., 3] > 0
        hid = (full[..., 3] > 0) & ~seen
        keep = hid.copy()
        for k in range(1, OVERLAP + 1): keep[:-k] |= hid[k:] & (full[:-k, ..., 3] > 0)   # (a few rows up behind his frames)
        img = full.copy(); img[~keep] = 0
        img = A.clean(img)
        crop, x, y = A.trim(img)
        crops.append(crop); info.append({'x': x * A.SCALE, 'y': y * A.SCALE})
        print(f'  legs {f + 1}/{N}', flush=True)
    stretch(False)
    for ob in list(bpy.data.objects):
        if ob.get('hanz'): bpy.data.objects.remove(ob)
    files = A.pack(crops, 'legs', info)
    src = open(A.TABLE).read()
    table = json.loads(src.split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
    table['legs'] = {'sheets': files, 'frames': info, 'fps': A.FPS}
    head = src.split('export const LOST_FRAMES = ', 1)[0]
    if '// legs =' not in head: head = head.rstrip('\n') + '\n// legs = his legs for the boss fight (hanz_legs.py: hanz_legs.png, frames like an animation\'s, drawn under his frames).\n'
    with open(A.TABLE, 'w') as fh: fh.write(head + 'export const LOST_FRAMES = ' + json.dumps(table, separators=(',', ':')) + ';\n')
    print('legs:', files, [c.shape for c in crops[:1]], info[0])
    if a.preview:
        os.makedirs(a.preview, exist_ok=True)
        idle = table['anims']['idle']; fr0 = idle['frames'][0]
        sheet = Image.open(os.path.join(A.OUT, idle['sheets'][fr0['k']])).convert('RGBA')
        body = sheet.crop((fr0['sx'], fr0['sy'], fr0['sx'] + fr0['w'], fr0['sy'] + fr0['h']))
        frames = []
        for c, i in zip(crops, info):
            can = Image.new('RGBA', (640, 360 + EXTRA * 2), (60, 50, 72, 255))
            im = Image.fromarray(c); can.alpha_composite(im.resize((im.width * 2, im.height * 2), Image.NEAREST), (i['x'], i['y']))
            can.alpha_composite(body.resize((body.width * 2, body.height * 2), Image.NEAREST), (fr0['x'], fr0['y']))
            frames.append(can.convert('RGB'))
        frames[0].save(os.path.join(a.preview, 'legs.png'))
        frames[0].save(os.path.join(a.preview, 'legs.gif'), save_all=True, append_images=frames[1:], duration=1000 // A.FPS, loop=0)


if __name__ == '__main__':
    main()
