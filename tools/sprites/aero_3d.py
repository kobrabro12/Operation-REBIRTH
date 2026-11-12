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
these sheets too. FULL AERO has his own 3D model too (king_model, --king).

Run:  python3 tools/sprites/aero_3d.py [--only idle,run,...] [--preview FILE]
      -> public/assets/fighters/aero/n64/ (idle/run/jump/fall + moves_sheet), the model as tools/sprites/art/aero64.blend
      python3 tools/sprites/aero_3d.py --king [...]: FULL AERO64 (king_model) -> aero/n64/king/, model art/aero64_full.blend
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


# ---- FULL AERO64: his transformed form as the same 3D model (Mason's FULL AERO drawing, art/full_aero.png, made 3D):
# gold gloves, belt and soles, an aqua star on the chest, a royal aqua cape with a white fur collar and a gold hem in
# the scarf's place, a big feathered wing (white feathers, aqua tips) behind him, a gold halo floating over the bowl,
# the goldfish in a tiny crown, and the GOLDEN SPEAR in his fist. On FULL AERO's rig (aero_king_draw: parts wings /
# halo / spear) with his spear moves and life (wings beating, halo bobbing).
import aero_king_draw as K
GOLD, ROYAL, FEATHER = K.GOLD, K.ROYAL, K.FEATHER
KOUT = os.path.join(OUT, 'king')
KBLEND = os.path.join(os.path.dirname(__file__), 'art', 'aero64_full.blend')


def torus(g, c, R, r, rgb, major=16, minor=6):
    """A ring lying flat (a halo): major radius R round centre c, tube radius r."""
    verts, faces = [], []
    for i in range(major):
        a = 2 * math.pi * i / major
        for j in range(minor):
            b = 2 * math.pi * j / minor
            rr = R + r * math.cos(b)
            verts.append((c[0] + rr * math.cos(a), c[1] - r * math.sin(b), c[2] + rr * math.sin(a)))
    for i in range(major):
        for j in range(minor):
            i2, j2 = (i + 1) % major, (j + 1) % minor
            faces.append([i * minor + j, i * minor + j2, i2 * minor + j2, i2 * minor + j])
    g.add(verts, faces, [rgb] * len(faces))


def king_model(stage=0):
    """FULL AERO64 as low-poly parts: model() re-coloured gold where he's gold, plus cape, wing, halo, crown, spear."""
    G = model(stage)
    for n in ('ffist', 'bfore'):                                                   # gold gloves
        G[n].c = [GOLD[1] if c in AQUA else c for c in G[n].c]
    for n in ('bshoe', 'fshoe'):                                                   # gold soles
        G[n].c = [GOLD[1] if c == SOLE else GOLD[0] if c == LIME else c for c in G[n].c]
    t = G['torso']; t.c = [GOLD[1] if c == LIME else c for c in t.c]               # gold belt
    keep = [i for i, c in enumerate(t.c) if c != AQUA[1]]                         # (the plus on the chest goes...)
    t.f = [t.f[i] for i in keep]; t.c = [t.c[i] for i in keep]; t.s = [t.s[i] for i in keep]
    R = {n: K.RIG[n][0] for n in K.ORDER}
    hips = R['torso']; cx, cy = hips[0] + 2.6, hips[1] - 11                        # (...for an aqua four-point star with a white heart)
    star = [(cx, cy - 4), (cx + 1, cy - 1), (cx + 4, cy), (cx + 1, cy + 1), (cx, cy + 4), (cx - 1, cy + 1), (cx - 4, cy), (cx - 1, cy - 1)]
    t.slab(star, 5.0, 6.6, AQUA[1], keep=True)
    t.ball((cx, cy, 6.6), (1.0, 1.0, 0.6), 0xffffff, 6, 4, keep=True)
    # the cape, in the scarf's place: aqua velvet hanging down his back, white fur collar, gold hem
    c = Geo(0); root = R['scarf']
    c.slab([(31, 21), (26, 21), (21, 25), (17, 33), (15, 42), (18, 47), (24, 44), (27, 38), (29, 30), (31, 25)], -8.6, -6.8, ROYAL[1], keep=True)
    c.slab([(17.2, 41.5), (15, 42), (18, 47), (24, 44), (25, 41.5), (22, 43.2), (18.4, 45)], -8.9, -6.5, GOLD[1], keep=True)
    c.slab([(24, 26), (21.5, 29), (19, 36), (18, 40), (20, 39), (23, 31)], -6.8, -6.4, ROYAL[0], keep=True)       # a velvet sheen
    c.tube((root[0] - 3, root[1] - 0.5), (root[0] + 3.5, root[1] - 0.5), 2.3, 2.3, 0xffffff, 8, 1.6, -4.5)         # the fur collar
    G['scarf'] = c
    # the wing: long feathers fanning up and back from between his shoulders, white with aqua tips, two layers
    w = Geo(0); base = R['wings']
    for layer, (z0, z1, n, ln, a0, a1) in enumerate(((-12.6, -11.6, 7, 31, -128, -198), (-11.0, -10.0, 6, 22, -135, -192))):
        for i in range(n):
            a = math.radians(a0 + (a1 - a0) * i / (n - 1)); L = ln * (1.0 - 0.12 * abs(i - (n - 1) * 0.35) / n)
            ux, uy = math.cos(a), math.sin(a); px, py = -uy, ux; wd = 3.9 - layer * 0.5
            p0 = (base[0] - 1, base[1] + 1.5)
            mid = (p0[0] + ux * L * 0.7, p0[1] + uy * L * 0.7); tip = (p0[0] + ux * L, p0[1] + uy * L)
            w.slab([p0, (p0[0] + ux * 4 + px * wd * 0.7, p0[1] + uy * 4 + py * wd * 0.7), (mid[0] + px * wd, mid[1] + py * wd),
                    (mid[0] - px * wd, mid[1] - py * wd), (p0[0] + ux * 4 - px * wd * 0.7, p0[1] + uy * 4 - py * wd * 0.7)],
                   z0 - i * 0.12, z1 - i * 0.12, FEATHER[1 if (i + layer) % 2 else 0], keep=True)
            w.slab([(mid[0] + px * wd, mid[1] + py * wd), (tip[0] + px * 0.6, tip[1] + py * 0.6), tip, (mid[0] - px * wd, mid[1] - py * wd)],
                   z0 - i * 0.12, z1 - i * 0.12, AQUA[1] if layer else AQUA[0], keep=True)
    w.ball((base[0] - 1, base[1] + 1, -10.5), (3.4, 3.4, 2.4), FEATHER[2], 8, 5, keep=True)                       # its root
    G['wings'] = w
    # the halo: a gold ring floating over the bowl
    h = Geo(0); hc = R['halo']; torus(h, (hc[0] + 0.6, hc[1] + 1.4, 0), 6.6, 0.9, GOLD[1]); G['halo'] = h
    # the goldfish's tiny crown
    fc = R['fish']; f = G['fish']
    f.tube((fc[0] + 0.8, fc[1] - 2.6), (fc[0] + 0.8, fc[1] - 3.8), 2.0, 2.0, GOLD[1], 8, 1.0, 0, keep=True)
    for dx, dz in ((-1.4, 0), (0.8, 1.2), (0.8, -1.2), (2.4, 0)):
        f.ball((fc[0] + 0.8 + dx * 0.6, fc[1] - 4.6, dz), (0.55, 1.1, 0.55), GOLD[0], 6, 4, keep=True)
    # the golden spear: along his forearm through the glove, a leaf-shaped head with a gleam and an aqua tassel
    s = Geo(0); gx, gy = R['spear']; z = 6.9
    L = math.hypot(2, 5); ux, uy = 2 / L, -5 / L; px, py = -uy, ux
    tip = (gx + ux * 25.5, gy + uy * 25.5); butt = (gx - ux * 17, gy - uy * 17); neck = (gx + ux * 16, gy + uy * 16)
    s.tube(butt, neck, 0.85, 0.85, GOLD[1], 6, 1.0, z, ring_cols=lambda k: GOLD[k % 2], keep=True)
    m = (neck[0] + ux * 3.4, neck[1] + uy * 3.4)
    hv = [neck, (m[0] + px * 3.6, m[1] + py * 3.6, ), tip, (m[0] - px * 3.6, m[1] - py * 3.6)]
    verts = [(hv[0][0], hv[0][1], z), (hv[1][0], hv[1][1], z), (hv[2][0], hv[2][1], z), (hv[3][0], hv[3][1], z), (m[0], m[1], z + 1.4), (m[0], m[1], z - 1.4)]
    s.add(verts, [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [1, 0, 5], [2, 1, 5], [3, 2, 5], [0, 3, 5]],
          [GOLD[0], 0xffffff, GOLD[0], GOLD[1], GOLD[2], GOLD[1], GOLD[2], GOLD[2]], smooth=False)
    s.tube((neck[0] - ux * 0.5, neck[1] - uy * 0.5), (neck[0] + ux * 1.0, neck[1] + uy * 1.0), 1.5, 1.5, GOLD[2], 6, 1.0, z, keep=True)
    s.ball((neck[0] - ux * 2 - px * 1.8, neck[1] - uy * 2 - py * 1.8, z), (1.1, 1.8, 1.1), AQUA[1], 6, 4, keep=True)   # the tassel
    s.ball((butt[0], butt[1], z), (1.3, 1.3, 1.3), GOLD[2], 6, 4, keep=True)                                       # the butt cap
    G['spear'] = s
    return G


def build_king(only=None, preview=None):
    """FULL AERO64: the king model on FULL AERO's rig (cut from Mason's drawing, so the 2D afterimages are his gold
    ones) with his spear moves and life -> aero/n64/king/. Same frame layout as the other AERO sheets."""
    import aero_king_mason
    global model
    base_model = model
    D3.place = place
    D3.model = lambda stage=0: king_model(stage)
    objs, cam = D3.build_scene(None, 0)
    if 'dome' in objs:
        gm = glass_material(); me = objs['dome'].data; me.materials.clear(); me.materials.append(gm)
    N.GHOST = (243, 195, 88)
    small, big = N.build_rig(aero_king_mason.source('full_aero.png'), AM.KFOLLOW)
    life = AM.king_life; k = N.k; J = ((N.JUMP, N.JUMP2), (N.FALL, N.FALL2))
    if not only:
        place(objs, small, {}); bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(KBLEND), compress=True)
    base = {'idle': (AM.idle_keys(), 192), 'run': (N.run_keys(), 48), 'jump': ([k(0, J[0][0]), k(12, J[0][1]), k(24, J[0][0])], 24), 'fall': ([k(0, J[1][0]), k(12, J[1][1]), k(24, J[1][0])], 24)}
    os.makedirs(KOUT, exist_ok=True)
    if preview:
        fr = D3.animate3d(objs, cam, small, base['idle'][0], 192, step=48, life=life)
        mv = D3.animate3d(objs, cam, big, AM.MOVES['k_fsmash'][1], AM.MOVES['k_fsmash'][0], step=8, smear=('spear', 'ffist'), smear_tint=N.GHOST, life=life)
        sheet = Image.new('RGBA', (64 * len(fr) + 112 * len(mv), 104), (120, 150, 190, 255))
        for j, f in enumerate(fr): sheet.alpha_composite(Image.fromarray(f), (j * 64, 20))
        for j, f in enumerate(mv): sheet.alpha_composite(Image.fromarray(f), (64 * len(fr) + j * 112, 0))
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(preview); return
    for nm, (keys, ticks) in base.items():
        if only and nm not in only: continue
        N.strip(D3.animate3d(objs, cam, small, keys, ticks, step=6, life=life), os.path.join(KOUT, nm + '_sheet.png'))
        print('king', nm, flush=True)
    if not only or 'moves' in only:
        mv = {}
        for name, (ticks, keys, step, smear, loop, center) in AM.MOVES.items():
            mv[name] = D3.animate3d(objs, cam, big, keys, ticks, step=step, smear=smear, smear_tint=N.GHOST, center=center, life=life)
        N.save_atlas(mv, os.path.join(KOUT, 'moves_sheet.png'), cols=24)
        retile(os.path.join(KOUT, 'moves_sheet.png'))
        D3.shrink(os.path.join(KOUT, 'moves_sheet.png'))
        print('king moves', sum(len(f) for f in mv.values()), 'frames', flush=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    only, prev = a[a.index('--only') + 1].split(',') if '--only' in a else None, a[a.index('--preview') + 1] if '--preview' in a else None
    (build_king if '--king' in a else build)(only, prev)
