"""CARTRIDGE in real 3D: THE DEVOTED's low-poly 64-bit costume is a 3D model built and rendered in Blender
(the `bpy` module - `pip install bpy`, Blender 5.x) instead of a 2D drawing.

How it works
  1. The model. Each body part of her CARTRIDGE drawing (devoted_draw.py, painted flat - FLAT3D) becomes a low-poly
     3D mesh: the part's silhouette is "inflated" into a rounded solid (a 3 px grid of vertices, each pushed out by
     how far it is from the edge - a cylinder's profile - front and back, meeting at the outline), so the arms and
     legs are round tubes, the torso a rounded slab, the head a ball with her ponytail. Every part sits at its own
     depth (back arm and leg behind, front ones in front). The drawing itself is projected onto the mesh as its
     texture (nearest-pixel, alpha-clipped to the drawn outline) - textured low-poly, the way 64-bit games did faces.
  2. Shading: flat-shaded triangles (every facet shows), lit in the material by a fixed key light from the
     upper left-front plus ambient (an emission shader: no noise, one sample per pixel), so it renders crisp.
  3. Animation: the same rig and the same keyframes as every other DEVOTED sheet (puppet.py, aero_moves.py,
     devoted_draw.py): for every frame, each part's 2D bone transform is turned into a 3D object matrix, then Blender
     renders the posed model through an orthographic camera turned ~22 degrees toward her front, so you see her in
     three-quarter view with real depth (the far limbs tuck behind, the near ones come forward).
  4. The frames go into the same sheets, in the same order, as the 2D build (so src/fighters/dvMoves.js still
     indexes them), with a 1 px dark outline added so she reads against busy stages.

Run:  python3 tools/sprites/devoted_3d.py [--stages 0,1,2,3] [--only idle,run,...] [--preview FILE]
      -> public/assets/fighters/devoted/cartridge/ (+ semi/ taken/ drowned/), and the model as
         tools/sprites/art/cartridge_devoted.blend (her rest pose, stage DEFAULT) for opening in Blender.
Takes a while (every frame of every move at every sludge stage is a Blender render).
"""
import os, sys, math, types, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(__file__))
import devoted_draw as V
import bpy
from puppet import pose_at, seg_ease

A = V.A
N = A.N
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/fighters/devoted/cartridge')
BLEND = os.path.join(os.path.dirname(__file__), 'art', 'cartridge_devoted.blend')
GRID = 3                                  # the mesh grid, px (smaller = more polygons)
YAW = math.radians(22)                    # how far the camera turns toward her front
DEPTH = {'bupper': -7, 'bfore': -7, 'bthigh': -4, 'bshin': -4, 'bshoe': -4, 'scarf': -9, 'torso': 0, 'head': 0.5,
         'fthigh': 4, 'fshin': 4, 'fshoe': 4, 'fupper': 7, 'ffore': 7, 'ffist': 8, 'fish': 0}
THICK = {'torso': 0.85, 'head': 0.95, 'scarf': 0.25}   # how round each part is (1 = as deep as it is wide)
LIGHT = (-0.55, 0.62, 0.56)               # Blender axes: x right, y up, z toward the camera
LINE = (16, 16, 26, 255)


def inflate(mask, thick=0.8):
    """A part's silhouette -> a low-poly rounded solid: (verts [[x, y, z]...] in drawing px, faces [[i, j, k]...]).
    Front and back surfaces on a GRID-px lattice, z from the distance to the edge (a cylinder's profile)."""
    big = ndimage.binary_dilation(mask, iterations=2)
    dt = ndimage.distance_transform_edt(big)
    R = max(1.5, float(dt.max()))
    H, W = mask.shape
    xs = list(range(0, W + 1, GRID)); ys = list(range(0, H + 1, GRID))
    idx = {}; verts = []
    def z_at(x, y):
        d = dt[min(H - 1, y), min(W - 1, x)]
        return 0.0 if d < 1.6 else math.sqrt(max(0.0, 2 * R * d - d * d)) * thick
    cell_in = lambda x, y: big[min(H - 1, y):min(H, y + GRID), min(W - 1, x):min(W, x + GRID)].any()
    cells = [(x, y) for y in ys[:-1] for x in xs[:-1] if cell_in(x, y)]
    def vid(x, y, side):
        key = (x, y, side)
        if key not in idx:
            z = z_at(x, y)
            idx[key] = len(verts); verts.append((x, y, z * side))
        return idx[key]
    faces = []
    for x, y in cells:
        for side in (1, -1):
            a, b, c, d = vid(x, y, side), vid(x + GRID, y, side), vid(x + GRID, y + GRID, side), vid(x, y + GRID, side)
            if side == 1: faces += [(a, d, c), (a, c, b)] if (x // GRID + y // GRID) % 2 else [(a, d, b), (b, d, c)]
            else: faces += [(a, c, d), (a, b, c)] if (x // GRID + y // GRID) % 2 else [(a, b, d), (b, c, d)]
    # close the rim: where a cell has no neighbour, join its front and back edges with a wall
    cs = set(cells)
    for x, y in cells:
        for (nx, ny), (p, q) in (((x, y - GRID), ((x, y), (x + GRID, y))), ((x, y + GRID), ((x + GRID, y + GRID), (x, y + GRID))),
                                  ((x - GRID, y), ((x, y + GRID), (x, y))), ((x + GRID, y), ((x + GRID, y), (x + GRID, y + GRID)))):
            if (nx, ny) in cs: continue
            f0, f1, b0, b1 = vid(*p, 1), vid(*q, 1), vid(*p, -1), vid(*q, -1)
            faces += [(f0, b0, b1), (f0, b1, f1)]
    return verts, faces


def material(name, img_arr):
    """The part's drawing as a nearest-pixel texture, alpha-clipped, times flat key + ambient light (an emission
    shader, so one sample per pixel renders clean)."""
    path = os.path.join(tempfile.gettempdir(), 'dv3d_tex_' + name + '.png')
    Image.fromarray(img_arr, 'RGBA').save(path)
    im = bpy.data.images.load(path, check_existing=False); im.pack()          # (packed into the .blend too)
    im.colorspace_settings.name = 'sRGB'; im.alpha_mode = 'STRAIGHT'
    m = bpy.data.materials.new(name + '_mat'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    L = nt.links
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = im; tex.interpolation = 'Closest'; tex.extension = 'CLIP'
    uv = nt.nodes.new('ShaderNodeTexCoord'); L.new(uv.outputs['UV'], tex.inputs['Vector'])
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    l = np.array(LIGHT); l = l / np.linalg.norm(l); dot.inputs[1].default_value = tuple(l)
    L.new(geo.outputs['Normal'], dot.inputs[0])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; mx.inputs[1].default_value = 0.0
    L.new(dot.outputs['Value'], mx.inputs[0])
    lit = nt.nodes.new('ShaderNodeMath'); lit.operation = 'MULTIPLY_ADD'; lit.inputs[1].default_value = 0.72; lit.inputs[2].default_value = 0.42
    L.new(mx.outputs['Value'], lit.inputs[0])
    snapn = nt.nodes.new('ShaderNodeMath'); snapn.operation = 'SNAP'; snapn.inputs[1].default_value = 0.09   # (light in steps: fewer colours, crisper facets)
    L.new(lit.outputs['Value'], snapn.inputs[0]); lit = snapn
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    L.new(tex.outputs['Color'], mul.inputs[6])
    cmb = nt.nodes.new('ShaderNodeCombineColor'); L.new(lit.outputs['Value'], cmb.inputs[0]); L.new(lit.outputs['Value'], cmb.inputs[1]); L.new(lit.outputs['Value'], cmb.inputs[2])
    L.new(cmb.outputs['Color'], mul.inputs[7])
    em = nt.nodes.new('ShaderNodeEmission'); L.new(mul.outputs[2], em.inputs['Color']); em.inputs['Strength'].default_value = 1.0
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    cut = nt.nodes.new('ShaderNodeMath'); cut.operation = 'GREATER_THAN'; cut.inputs[1].default_value = 0.5
    L.new(tex.outputs['Alpha'], cut.inputs[0])
    mix = nt.nodes.new('ShaderNodeMixShader'); L.new(cut.outputs['Value'], mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); L.new(mix.outputs[0], out.inputs['Surface'])
    return m


def build_scene(layers):
    """Her model in Blender: one low-poly object per body part (inflate + its drawing as texture)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1; sc.cycles.use_denoising = False
    sc.cycles.pixel_filter_type = 'BOX'; sc.cycles.filter_width = 0.01
    sc.cycles.max_bounces = 0; sc.cycles.transparent_max_bounces = 24
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.resolution_percentage = 100
    objs = {}
    for name in V.ORDER:
        a = layers[name]
        if name == 'fish' or not (a[..., 3] > 0).any(): continue
        verts, faces = inflate(a[..., 3] > 0, THICK.get(name, 0.8))
        me = bpy.data.meshes.new(name)
        me.from_pydata([(x, -y, z) for x, y, z in verts], [], faces); me.update()
        uvl = me.uv_layers.new(name='UV')
        for poly in me.polygons:
            poly.use_smooth = False
            for li in poly.loop_indices:
                x, y, _ = verts[me.loops[li].vertex_index]
                uvl.data[li].uv = (x / a.shape[1], 1 - y / a.shape[0])
        me.materials.append(material(name, a))
        ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
        objs[name] = ob
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.clip_start = 0.1; cam.data.clip_end = 1000
    return objs, cam


def place(objs, rig, pose):
    """Poses the model: each part's 2D bone transform (rig.matrix: drawing px -> frame px) as its 3D object matrix
    (y flipped to Blender's up; depth scaled with the part, at the part's own depth)."""
    from mathutils import Matrix
    hide = set(pose.get('_hide', ()))
    for name, ob in objs.items():
        M = rig.matrix(name, pose)
        a, b, tx, c, d, ty = M[0, 0], M[0, 1], M[0, 2], M[1, 0], M[1, 1], M[1, 2]
        s = math.sqrt(abs(a * d - b * c))
        ob.matrix_world = Matrix(((a, -b, 0, tx), (-c, d, 0, -ty), (0, 0, s, DEPTH.get(name, 0)), (0, 0, 0, 1)))
        ob.hide_render = name in hide


def aim(cam, rig):
    """The orthographic camera framing the rig's canvas, turned YAW toward her front, centred on her feet's column."""
    W, H = rig.canvas
    sc = bpy.context.scene; sc.render.resolution_x = W; sc.render.resolution_y = H
    cam.data.ortho_scale = max(W, H)
    cam.data.sensor_fit = 'HORIZONTAL' if W >= H else 'VERTICAL'
    fx = rig.offset[0] + rig.feet[0]
    cx, cy = fx, H / 2
    D = 300
    cam.location = (cx + math.sin(YAW) * D + (W / 2 - fx), -cy, math.cos(YAW) * D)
    cam.rotation_euler = (0, YAW, 0)


def snap(path):
    """Renders one frame and reads it back as an RGBA array, with a 1 px dark outline round her."""
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = np.array(Image.open(path).convert('RGBA'))
    a = img[..., 3] > 127
    img[~a] = 0; img[a, 3] = 255
    ring = ~a & (V.sh(a, 1, 0) | V.sh(a, -1, 0) | V.sh(a, 0, 1) | V.sh(a, 0, -1))
    img[ring] = LINE
    return img


def animate3d(objs, cam, rig, keys, ticks, step=2, smear=(), smear_tint=None, center=None, life=None):
    """Like puppet.animate, but every frame is a Blender render of the posed 3D model (the smear afterimages are
    still the flat 2D rig's, tinted, behind her)."""
    aim(cam, rig)
    frames, feet = [], rig.feet
    if center: rig.feet = center
    tmp = os.path.join(tempfile.gettempdir(), 'dv3d_frame.png')
    for t in range(0, ticks, step):
        pose = dict(pose_at(keys, t)); prev = dict(pose_at(keys, max(0, t - 3)))
        if life: pose = life(pose, t); prev = life(prev, max(0, t - 3))
        pose['_prev'] = prev
        place(objs, rig, pose)
        img = snap(tmp)
        if smear and seg_ease(keys, t) in ('snap', 'out', 'linear'):
            for back, al in ((2, 120), (4, 60)):
                pp = pose_at(keys, max(0, t - back))
                if life: pp = life(dict(pp), max(0, t - back))
                if any(abs((pp.get(n, (0,))[0]) - (pose.get(n, (0,))[0])) > 12 for n in smear):
                    ghost = rig.render(pp, only=smear, tint=smear_tint, alpha=al)
                    m = (img[..., 3] == 0) & (ghost[..., 3] > 0); img[m] = ghost[m]
        frames.append(img)
    rig.feet = feet
    return frames


def shrink(path):
    """Rewrites a sheet as a 255-colour palette PNG (the 3D shading makes a lot of near-identical colours)."""
    im = Image.open(path).convert('RGBA')
    im.quantize(255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def build_stage(i, only=None, preview=None):
    """Every sheet of one sludge stage (0 DEFAULT .. 3 DROWNED) from the 3D model."""
    layers = V.draw_parts(i)
    look = types.SimpleNamespace(draw_parts=lambda L=layers: {n: x.copy() for n, x in L.items()}, composite=V.composite, ORDER=V.ORDER, RIG=V.D.RIG)
    small, big = N.build_rig(look, V.FOLLOW)
    objs, cam = build_scene(layers)
    if i == 0 and not only:
        place(objs, small, {}); os.makedirs(os.path.dirname(BLEND), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), compress=True)
    life = V.make_life(i)
    idle = V.drowned_idle_keys if i == 3 else V.idle_keys
    run = V.drowned_glide_keys if i == 3 else N.run_keys
    J = ((N.JUMP, N.JUMP2), (N.FALL, N.FALL2)); k = N.k
    base = {'idle': (idle(), 192), 'run': (run(), 48), 'jump': ([k(0, J[0][0]), k(12, J[0][1]), k(24, J[0][0])], 24), 'fall': ([k(0, J[1][0]), k(12, J[1][1]), k(24, J[1][0])], 24)}
    out = os.path.join(OUT, '') if i == 0 else os.path.join(OUT, V.STAGES[i])
    os.makedirs(out, exist_ok=True)
    if preview:
        fr = animate3d(objs, cam, small, base['idle'][0], 192, step=24, life=life)
        fr += animate3d(objs, cam, small, base['run'][0], 48, step=12, life=life)
        mv = animate3d(objs, cam, big, V.MOVES['fsmash'][1], V.MOVES['fsmash'][0], step=6, life=life)
        sheet = Image.new('RGBA', (64 * len(fr) + 112 * len(mv), 104), (120, 150, 190, 255))
        for j, f in enumerate(fr): sheet.alpha_composite(Image.fromarray(f), (j * 64, 20))
        for j, f in enumerate(mv): sheet.alpha_composite(Image.fromarray(f), (64 * len(fr) + j * 112, 0))
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(preview); return
    for nm, (keys, ticks) in base.items():
        if only and nm not in only: continue
        N.strip(animate3d(objs, cam, small, keys, ticks, step=6, life=life), os.path.join(out, nm + '_sheet.png'))
        print(V.STAGES[i], nm, flush=True)
    if not only or 'moves' in only:
        mv = {}
        for name, (ticks, keys, step, smear, loop, center) in V.MOVES.items():
            mv[name] = animate3d(objs, cam, big, keys, ticks, step=step, smear=smear, smear_tint=N.GHOST, center=center, life=life)
        N.save_atlas(mv, os.path.join(out, 'moves_sheet.png'), cols=24)
        shrink(os.path.join(out, 'moves_sheet.png'))
        print(V.STAGES[i], 'moves', sum(len(f) for f in mv.values()), 'frames', flush=True)


if __name__ == '__main__':
    V.VARIANTS['cartridge']['poly'] = False                    # (flat 4-tone paint: the model does the lighting)
    V.FLAT3D = True
    V.apply_variant('cartridge')
    args = sys.argv[1:]
    stages = [int(x) for x in args[args.index('--stages') + 1].split(',')] if '--stages' in args else [0, 1, 2, 3]
    only = args[args.index('--only') + 1].split(',') if '--only' in args else None
    prev = args[args.index('--preview') + 1] if '--preview' in args else None
    for i in stages: build_stage(i, only, prev)
