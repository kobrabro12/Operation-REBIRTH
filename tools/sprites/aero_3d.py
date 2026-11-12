"""AERO64: AERO as a real low-poly 3D model, built and rendered in Blender like THE DEVOTED's CARTRIDGE
(tools/sprites/devoted_3d.py, whose mesh builder, Gouraud material, camera and renderer this reuses).

The model (model()), part by part round AERO's rig (aero_draw.RIG), N64 proportions:
  - a big GLASS FISHBOWL for a head: a 12-sided sphere of see-through glass (a real transparent shader, more solid
    toward the rim, with a white shine), water filling its lower half, a chunky white collar ring;
  - the GOLDFISH inside (rig part `fish`, so it swims and turns like his 2D one): an orange body, a forked tail and
    fins, big cartoon eyes;
  - a white space suit: an 8-sided torso with a lime belt and a raised aqua plus on the chest, aqua shoulder pads,
    6-sided arms with elbow joints, big round aqua gloves;
  - legs with knee joints and big round aqua moon boots on lime soles;
  - the LEAF SCARF (rig part `scarf`): a long low-poly leaf with a midrib, streaming from his back.
Smooth Gouraud shading from one key light, rendered at 3x and averaged down (the soft 64-bit look), a dark outline,
three-quarter camera. Same rig, keyframes and frame order as aero_moves.py, so src/fighters/aeroMoves.js indexes
these sheets too (FULL AERO keeps his own form).

Run:  python3 tools/sprites/aero_3d.py [--only idle,run,...] [--preview FILE]
      -> public/assets/fighters/aero/n64/ (idle/run/jump/fall + moves_sheet), the model as tools/sprites/art/aero64.blend
"""
import os, sys, math, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import devoted_3d as D3
from devoted_3d import Geo
import aero_moves as AM
import nu_moves as N
import bpy

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/fighters/aero/n64')
BLEND = os.path.join(os.path.dirname(__file__), 'art', 'aero64.blend')
RIG = AM.aero_draw.RIG
ALIAS = {'dome': 'head'}                    # extra objects that ride on a rig part

SUIT = (0xe8f2f8, 0xffffff); AQUA = (0x1aa8e0, 0x5ad8ff); LIME = 0x8ae83a; SOLE = 0x4ab81a
FISH = (0xff6a10, 0xffa040); LEAF = (0x3a9a2a, 0x7ad84a); GLASS = 0xc8f4ff; WATER = 0x30b8f0; BLK = 0x101018


def model(stage=0):
    """AERO64 as low-poly parts in his rest pose (drawing coordinates), one Geo per rig part (+ the glass dome)."""
    names = list(AM.aero_draw.ORDER) + ['dome']
    G = {n: Geo(0) for n in names}
    R = {n: RIG[n][0] for n in AM.aero_draw.ORDER}
    # legs: suit-white thighs and shins with knee joints, big round aqua moon boots on lime soles
    for side, z in (('b', -3.4), ('f', 3.4)):
        hip, knee, ankle = R[side + 'thigh'], R[side + 'shin'], R[side + 'shoe']
        G[side + 'thigh'].tube(hip, knee, 3.9, 3.3, SUIT[0], 8, 0.95, z, ring_cols=lambda k: SUIT[k % 2])
        G[side + 'thigh'].ball((knee[0], knee[1], z), (3.2, 3.2, 3.2), SUIT[1], 8, 5)
        G[side + 'shin'].tube(knee, (ankle[0], ankle[1] - 1), 3.2, 3.6, AQUA[0], 8, 0.95, z, ring_cols=lambda k: AQUA[k % 2])
        G[side + 'shoe'].ball((ankle[0] + 1.6, ankle[1] + 1.2, z), (5.4, 3.6, 4.0), AQUA[0], 10, 6)
        G[side + 'shoe'].tube((ankle[0] - 3.6, ankle[1] + 4.0), (ankle[0] + 6.8, ankle[1] + 4.0), 1.1, 1.1, SOLE, 6, 3.6, z, smooth=False)
        G[side + 'shoe'].tube((ankle[0] - 3.0, ankle[1] + 2.6), (ankle[0] + 6.4, ankle[1] + 2.6), 0.7, 0.7, LIME, 6, 4.2, z, smooth=False)
    # torso: a rounded white suit, lime belt, aqua plus on the chest, a collar ring for the bowl
    hips, neck = R['torso'], R['head']
    G['torso'].tube((hips[0], hips[1] + 1.5), (hips[0] + 0.3, hips[1] - 3), 6.4, 6.8, SUIT[0], 10, 0.8)
    G['torso'].tube((hips[0] + 0.3, hips[1] - 3), (hips[0] + 0.4, hips[1] - 5), 6.9, 6.9, LIME, 10, 0.8)
    G['torso'].tube((hips[0] + 0.4, hips[1] - 5), (neck[0] + 0.4, neck[1] + 2.5), 6.9, 7.6, SUIT[1], 10, 0.8, ring_cols=lambda k: SUIT[k % 2])
    cx, cy = hips[0] + 2.6, hips[1] - 11
    G['torso'].slab([(cx - 0.9, cy - 3), (cx + 0.9, cy - 3), (cx + 0.9, cy - 0.9), (cx + 3, cy - 0.9), (cx + 3, cy + 0.9), (cx + 0.9, cy + 0.9),
                     (cx + 0.9, cy + 3), (cx - 0.9, cy + 3), (cx - 0.9, cy + 0.9), (cx - 3, cy + 0.9), (cx - 3, cy - 0.9), (cx - 0.9, cy - 0.9)], 5.0, 6.4, AQUA[1], keep=True)
    G['torso'].tube((neck[0], neck[1] + 2.5), (neck[0] + 0.2, neck[1] + 0.3), 5.6, 5.4, SUIT[1], 12, 0.9)          # the collar ring
    # arms: aqua shoulder pads, white sleeves, elbow joints, big aqua gloves
    for side, z in (('b', -6.6), ('f', 6.6)):
        sh, el = R[side + 'upper'], R[side + 'fore']
        G[side + 'upper'].ball((sh[0], sh[1], z), (3.8, 3.4, 3.6), AQUA[0], 8, 5)
        G[side + 'upper'].tube(sh, el, 2.7, 2.5, SUIT[0], 8, 1.0, z, ring_cols=lambda k: SUIT[k % 2])
        G[side + 'fore'].ball((el[0], el[1], z), (2.5, 2.5, 2.5), SUIT[1], 6, 4)
    bel = R['bfore']; G['bfore'].tube(bel, (bel[0] + 0.6, bel[1] + 6), 2.5, 2.4, SUIT[0], 8, 1.0, -6.6)
    G['bfore'].ball((bel[0] + 0.8, bel[1] + 8.2, -6.6), (3.5, 3.5, 3.3), AQUA[0], 8, 5)
    fel, fh = R['ffore'], R['ffist']
    G['ffore'].tube(fel, fh, 2.5, 2.4, SUIT[0], 8, 1.0, 6.6)
    G['ffist'].ball((fh[0], fh[1] - 0.5, 6.9), (3.6, 3.6, 3.4), AQUA[0], 8, 5)
    # the leaf scarf: a long leaf streaming back from between his shoulders, with a midrib
    root = R['scarf']; tip = (root[0] - 17, root[1] + 10)
    edge = [root, (root[0] - 4, root[1] - 3), (root[0] - 10, root[1] - 1), (tip[0] + 2, tip[1] - 2), tip, (root[0] - 12, root[1] + 7), (root[0] - 5, root[1] + 5)]
    G['scarf'].slab(edge, -7.6, -6.6, LEAF[0], keep=True)
    G['scarf'].slab([(root[0] - 1, root[1] + 0.6), (root[0] - 9, root[1] + 3.2), (tip[0] + 1, tip[1] - 0.6), (root[0] - 9, root[1] + 4.2)], -6.6, -6.2, LEAF[1], keep=True)
    # the goldfish: a round orange body, a forked tail, fins, big eyes (it swims about in the bowl with its rig part)
    fc = R['fish']
    G['fish'].ball((fc[0] + 0.8, fc[1], 0), (4.6, 3.3, 2.6), FISH[0], 10, 6)
    G['fish'].slab([(fc[0] - 3.2, fc[1]), (fc[0] - 7.8, fc[1] - 3.2), (fc[0] - 6.6, fc[1]), (fc[0] - 7.8, fc[1] + 3.2)], -0.5, 0.5, FISH[1], keep=True)
    G['fish'].slab([(fc[0] + 0.8, fc[1] - 2.8), (fc[0] - 1.8, fc[1] - 5.0), (fc[0] - 2.2, fc[1] - 2.4)], -0.4, 0.4, FISH[1], keep=True)
    for ez in (2.1, -2.1):
        G['fish'].ball((fc[0] + 3.4, fc[1] - 0.8, ez), (1.2, 1.2, 0.6), 0xffffff, 6, 4, keep=True)
        G['fish'].ball((fc[0] + 4.0, fc[1] - 0.8, ez * 1.15), (0.6, 0.65, 0.35), BLK, 6, 3, keep=True)
    # the bowl: water filling its lower half (inside the glass), and the glass itself (its own see-through object)
    hc = (neck[0] + 0.6, neck[1] - 8.6, 0.0); r = 9.6
    wl = hc[1] + 0.5                                                                  # the waterline
    w = Geo(0); w.ball(hc, (r - 0.7, r - 0.7, r - 0.7), WATER, 12, 8)
    keep = [i for i, f in enumerate(w.f) if sum(w.v[k][1] for k in f) / len(f) > wl and sum(w.v[k][2] for k in f) / len(f) < 0.5]   # the back half below the waterline (so the fish shows in front of it)
    G['head'].add(w.v, [w.f[i] for i in keep], [WATER] * len(keep))
    G['head'].slab([(hc[0] - r + 1.2, wl), (hc[0] + r - 1.2, wl), (hc[0] + r - 1.6, wl + 0.6), (hc[0] - r + 1.6, wl + 0.6)], -r + 2, r - 2, 0x7ae0ff, keep=True)   # the surface
    b = Geo(0); b.ball(hc, (r - 0.4, r - 0.4, r - 0.4), 0x9adcf0, 12, 9)            # the back of the bowl, seen through the glass
    back = [i for i, f in enumerate(b.f) if sum(b.v[k][2] for k in f) / len(f) < -0.5]
    G['head'].add(b.v, [b.f[i] for i in back], [0x9adcf0] * len(back))
    G['dome'].ball(hc, (r, r, r), GLASS, 12, 9)
    G['dome'].glass = True
    return G


def glass_material():
    """See-through glass: a pale aqua tint lit like everything else, more solid toward the rim (layer weight), a
    transparent middle so the goldfish shows through."""
    m = D3.palette_material(); m.name = 'aero64_glass'
    nt = m.node_tree; L = nt.links
    em = next(n for n in nt.nodes if n.type == 'EMISSION'); out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    rim = nt.nodes.new('ShaderNodeMath'); rim.operation = 'MULTIPLY_ADD'; rim.inputs[1].default_value = 0.7; rim.inputs[2].default_value = 0.08
    L.new(lw.outputs['Facing'], rim.inputs[0])
    mix = nt.nodes.new('ShaderNodeMixShader'); L.new(rim.outputs['Value'], mix.inputs['Fac'])
    L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs['Surface'])
    return m


def build_scene():
    """AERO64 in Blender: one object per part (the dome with its glass material)."""
    D3.model = model
    objs, cam = D3.build_scene(None, 0)
    if 'dome' in objs:
        gm = glass_material(); me = objs['dome'].data; me.materials.clear(); me.materials.append(gm)
    return objs, cam


def place(objs, rig, pose):
    """Poses every part from the rig (aliases ride on their rig part)."""
    from mathutils import Matrix
    hide = set(pose.get('_hide', ()))
    for name, ob in objs.items():
        part = ALIAS.get(name, name)
        M = rig.matrix(part, pose)
        a, b, tx, c, d, ty = M[0, 0], M[0, 1], M[0, 2], M[1, 0], M[1, 1], M[1, 2]
        s = math.sqrt(abs(a * d - b * c))
        ob.matrix_world = Matrix(((a, -b, 0, tx), (-c, d, 0, -ty), (0, 0, s, 0), (0, 0, 0, 1)))
        ob.hide_render = part in hide


def retile(path, cols=36, fw=112, fh=104):
    """Re-lays the moves sheet 36 frames to a row so neither side passes 4096 px (frame numbers don't change)."""
    im = Image.open(path).convert('RGBA'); c0 = im.width // fw
    frames = [im.crop((i % c0 * fw, i // c0 * fh, i % c0 * fw + fw, i // c0 * fh + fh)) for i in range(c0 * (im.height // fh))]
    while frames and not frames[-1].getbbox(): frames.pop()
    out = Image.new('RGBA', (cols * fw, math.ceil(len(frames) / cols) * fh))
    for i, f in enumerate(frames): out.paste(f, (i % cols * fw, i // cols * fh))
    out.save(path)


def build(only=None, preview=None):
    D3.place = place                                   # (animate3d poses through D3.place)
    objs, cam = build_scene()
    small, big = AM.SMALL, AM.BIG
    if not only:
        place(objs, small, {}); os.makedirs(os.path.dirname(BLEND), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), compress=True)
    life = AM.life; k = N.k; J = ((N.JUMP, N.JUMP2), (N.FALL, N.FALL2))
    base = {'idle': (AM.idle_keys(), 192), 'run': (N.run_keys(), 48), 'jump': ([k(0, J[0][0]), k(12, J[0][1]), k(24, J[0][0])], 24), 'fall': ([k(0, J[1][0]), k(12, J[1][1]), k(24, J[1][0])], 24)}
    os.makedirs(OUT, exist_ok=True)
    if preview:
        fr = D3.animate3d(objs, cam, small, base['idle'][0], 192, step=48, life=life)
        fr += D3.animate3d(objs, cam, small, base['run'][0], 48, step=12, life=life)
        mv = D3.animate3d(objs, cam, big, AM.MOVES['fsmash'][1], AM.MOVES['fsmash'][0], step=8, life=life)
        sheet = Image.new('RGBA', (64 * len(fr) + 112 * len(mv), 104), (120, 150, 190, 255))
        for j, f in enumerate(fr): sheet.alpha_composite(Image.fromarray(f), (j * 64, 20))
        for j, f in enumerate(mv): sheet.alpha_composite(Image.fromarray(f), (64 * len(fr) + j * 112, 0))
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(preview); return
    for nm, (keys, ticks) in base.items():
        if only and nm not in only: continue
        N.strip(D3.animate3d(objs, cam, small, keys, ticks, step=6, life=life), os.path.join(OUT, nm + '_sheet.png'))
        print(nm, flush=True)
    if not only or 'moves' in only:
        mv = {}
        for name, (ticks, keys, step, smear, loop, center) in AM.MOVES.items():
            mv[name] = D3.animate3d(objs, cam, big, keys, ticks, step=step, smear=smear, smear_tint=N.GHOST, center=center, life=life)
        N.save_atlas(mv, os.path.join(OUT, 'moves_sheet.png'), cols=24)
        retile(os.path.join(OUT, 'moves_sheet.png'))
        D3.shrink(os.path.join(OUT, 'moves_sheet.png'))
        print('moves', sum(len(f) for f in mv.values()), 'frames', flush=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    build(a[a.index('--only') + 1].split(',') if '--only' in a else None, a[a.index('--preview') + 1] if '--preview' in a else None)
