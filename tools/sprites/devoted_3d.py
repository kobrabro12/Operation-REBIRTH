"""CARTRIDGE in real 3D: THE DEVOTED's low-poly 64-bit costume is a 3D model built and rendered in Blender
(the `bpy` module - `pip install bpy`, Blender 5.x) instead of a 2D drawing.

How it works
  1. The model (model()): real low-poly geometry, built part by part round the rig's bones (each part from its pivot
     to its child's pivot): a 10x7 ellipsoid head (skin facing forward, orange hair over the top and back) with a
     fringe, a three-segment ponytail, a neck, painted-on 3D eyes (white slabs with pupils) and a smile; an 8-sided
     tapered torso (teal jacket with a yellow zig-zag band, purple shorts at the hips) and a collar; 6-sided arms
     (striped sleeves, yellow cuffs, shoulder and elbow joints, ball fists); 6-sided legs with knee joints; chunky
     4-sided boots with dark soles; the karambit as a real 1.4 px thick crystal slab with a bright edge, its ring a
     loop of little tubes. Arms and legs sit at their own depths (back ones behind, front ones in front). Each face
     has its own colour (a face-corner colour attribute) - no drawing is projected on it. The sludge stages colour
     the faces from the top down as she sinks (COVER): black and violet polygons with a few glitching cyan / magenta
     ones, drips off her head; DROWNED adds a giant low-poly demon wing (membrane slabs + bones with glowing tips),
     glowing eyes and a white grin.
  2. Shading: N64-style smooth Gouraud shading on the rounded parts (flat on caps, boots' soles, eyes, blade), one key
     light from up front-right plus ambient (an emission shader - no noise); rendered at SS x size and averaged down
     for the soft, filtered look of 64-bit games, then a dark-indigo outline.
  3. Animation: the same rig and keyframes as every other DEVOTED sheet (puppet.py, aero_moves.py, devoted_draw.py):
     each part's 2D bone transform each frame becomes its 3D object matrix (it turns about its joint), then Blender
     renders the posed model through an orthographic camera turned 30 degrees toward her front (three-quarter view).
  4. The frames go into the same sheets, in the same order, as the 2D build (so src/fighters/dvMoves.js still
     indexes them), with a 1 px dark outline, the moves sheet packed to a 255-colour palette.

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
YAW = math.radians(30)                    # how far the camera turns toward her front
LIGHT = (0.5, 0.7, 0.55)                  # Blender axes: x right, y up, z toward the camera (from up, front-right: on her face)
LINE = (28, 24, 56, 255)                  # (a soft dark-indigo outline, so she still reads on busy stages)
SS = 3                                    # render at 3x and average down: the soft, filtered look of 64-bit games


# ------------------------------------------------------------------ the model (real low-poly geometry, no drawing on it)
TEAL = (0x0c6a74, 0x14a0a6); SLEEVE = (0x2ac8c0, 0x7af0e4); YEL = 0xffe848; PURP = 0x7a2ab0; ORNG = 0xff9420; SOLE = 0x7a2a04
SKINC = 0xf0a878; HAIRC = 0xf06a1a; WHITE = 0xffffff; BLK = 0x101018; CRYS = (0x30b8f0, 0x90f0ff)
SLD = (0x0c0418, 0x1c0838, 0x3a1070); GLITCH = (0x20e8ff, 0xff3ad8)


class Geo:
    """A part's mesh being built: vertices in drawing px (x right, y down, z toward the camera), triangles/quads,
    and a colour per face."""
    def __init__(self, stage):
        self.v, self.f, self.c, self.s, self.stage = [], [], [], [], stage

    def col(self, rgb, pos, skin=False, keep=False):
        """A face's colour at rest position pos (x, y, z): the sludge covers her from the top down as she sinks
        deeper (COVER per stage), as polygons of black and violet with a few glitching cyan/magenta ones."""
        if keep or self.stage == 0: return rgb
        cover = V.COVER[self.stage]
        h = math.sin(pos[0] * 12.9898 + pos[1] * 78.233 + pos[2] * 37.7) * 43758.5453; h -= math.floor(h)
        if cover >= 1 or pos[1] < 4 + cover * 60 + (h - 0.5) * 10:
            return GLITCH[int(h * 7) % 2] if h > 0.93 else SLD[int(h * 3) % 3]
        return rgb

    def add(self, verts, faces, cols, smooth=True):
        o = len(self.v); self.v += verts; self.f += [[i + o for i in f] for f in faces]; self.c += cols; self.s += [smooth] * len(faces)

    def tube(self, p0, p1, r0, r1, rgb, sides=6, depth=1.0, z=0.0, caps=True, ring_cols=None, keep=False, smooth=True):
        """A tapered n-sided tube from p0 to p1 (a limb), its cross-section r wide in the picture and r*depth deep."""
        (x0, y0), (x1, y1) = p0, p1
        L = math.hypot(x1 - x0, y1 - y0) or 1; ux, uy = (x1 - x0) / L, (y1 - y0) / L; wx, wy = -uy, ux
        rings = []
        for (cx, cy, r) in ((x0, y0, r0), (x1, y1, r1)):
            rings.append([(cx + wx * r * math.cos(a), cy + wy * r * math.cos(a), z + r * depth * math.sin(a))
                          for a in (2 * math.pi * (k + 0.5) / sides for k in range(sides))])
        verts = rings[0] + rings[1]; faces, cols = [], []
        for k in range(sides):
            k2 = (k + 1) % sides; faces.append([k, k2, sides + k2, sides + k])
            mid = [(verts[k][j] + verts[sides + k2][j]) / 2 for j in range(3)]
            cols.append(self.col(ring_cols(k) if ring_cols else rgb, mid, keep=keep))
        self.add(verts, faces, cols, smooth)
        if caps:                                                             # (flat end caps, their own vertices)
            o = len(self.v); self.v += rings[0] + rings[1]
            self.f += [[o + k for k in range(sides - 1, -1, -1)], [o + sides + k for k in range(sides)]]
            self.c += [self.col(rgb, verts[0], keep=keep), self.col(rgb, verts[sides], keep=keep)]; self.s += [False, False]

    def ball(self, c, r, rgb, seg=8, rings=6, colfn=None, keep=False):
        """A low-poly ellipsoid (r = (rx, ry, rz)) - a head, a fist, a joint. colfn(normal) can colour each face."""
        verts = [(c[0], c[1] - r[1], c[2])]
        for i in range(1, rings):
            th = math.pi * i / rings
            for j in range(seg):
                ph = 2 * math.pi * j / seg
                verts.append((c[0] + r[0] * math.sin(th) * math.cos(ph), c[1] - r[1] * math.cos(th), c[2] + r[2] * math.sin(th) * math.sin(ph)))
        verts.append((c[0], c[1] + r[1], c[2])); bot = len(verts) - 1
        faces = []
        for j in range(seg): faces.append([0, 1 + (j + 1) % seg, 1 + j])
        for i in range(rings - 2):
            for j in range(seg):
                a = 1 + i * seg + j; b = 1 + i * seg + (j + 1) % seg; faces.append([a, b, b + seg, a + seg])
        base = 1 + (rings - 2) * seg
        for j in range(seg): faces.append([base + j, base + (j + 1) % seg, bot])
        cols = []
        for fc in faces:
            m = [sum(verts[k][d] for k in fc) / len(fc) for d in range(3)]
            n = ((m[0] - c[0]) / r[0], (m[1] - c[1]) / r[1], (m[2] - c[2]) / r[2])
            cols.append(self.col(colfn(n) if colfn else rgb, m, keep=keep))
        self.add(verts, faces, cols)

    def slab(self, pts, z0, z1, rgb, keep=False):
        """A flat shape (a 2D outline) given thickness from z0 to z1 - the knife's blade, a wing's membrane."""
        n = len(pts); verts = [(x, y, z1) for x, y in pts] + [(x, y, z0) for x, y in pts]
        faces = [list(range(n)), list(range(2 * n - 1, n - 1, -1))]
        for k in range(n): k2 = (k + 1) % n; faces.append([k2, k, n + k, n + k2])
        cx = sum(p[0] for p in pts) / n; cy = sum(p[1] for p in pts) / n
        self.add(verts, faces, [self.col(rgb, (cx, cy, z1), keep=keep)] * len(faces), smooth=False)


def model(stage):
    """THE DEVOTED (CARTRIDGE) as low-poly 3D parts, in her rest pose and the rig's drawing coordinates: one Geo per
    rig part, each built round that part's bone (pivot -> its child's pivot)."""
    G = {n: Geo(stage) for n in V.ORDER}
    R = {n: V.D.RIG[n][0] for n in V.ORDER}
    # legs: thigh, shin, boot (the boot a chunky block with a darker sole, toe forward)
    for side, z in (('b', -3.2), ('f', 3.2)):
        hip, knee, ankle = R[side + 'thigh'], R[side + 'shin'], R[side + 'shoe']
        G[side + 'thigh'].tube(hip, knee, 3.6, 3.0, PURP, 6, 0.95, z)
        G[side + 'thigh'].ball((knee[0], knee[1], z), (2.9, 2.9, 2.9), PURP, 6, 4)
        G[side + 'shin'].tube(knee, ankle, 2.9, 2.5, PURP, 6, 0.95, z)
        toe = ankle[0] + 6
        G[side + 'shoe'].ball((ankle[0] + 2.2, ankle[1] + 1.4, z), (5.2, 3.3, 3.6), ORNG, 8, 5)                    # big round cartoon boots
        G[side + 'shoe'].tube((ankle[0] - 3.0, ankle[1] + 3.9), (toe + 1.4, ankle[1] + 3.9), 1.0, 1.0, SOLE, 4, 3.6, z, smooth=False)
    # torso: hips -> chest, a tapered 8-sided jacket, a yellow zig-zag band round the middle, purple shorts at the bottom
    hips, neck = R['torso'], R['head']
    zig = lambda k: YEL if k % 2 == 0 else TEAL[1]
    G['torso'].tube((hips[0], hips[1] + 1), (hips[0] + 0.5, hips[1] - 4), 5.6, 5.8, PURP, 8, 0.72)
    G['torso'].tube((hips[0] + 0.5, hips[1] - 4), (hips[0] + 0.8, hips[1] - 7), 5.8, 6.2, TEAL[1], 8, 0.72, ring_cols=zig)
    G['torso'].tube((hips[0] + 0.8, hips[1] - 7), (neck[0] + 0.5, neck[1] + 2), 6.2, 6.6, TEAL[1], 8, 0.72, ring_cols=lambda k: TEAL[k % 2])
    G['torso'].tube((neck[0] + 0.5, neck[1] + 2), (neck[0] + 1, neck[1] - 1), 4.2, 2.4, TEAL[0], 8, 0.8)            # collar / shoulders
    # arms: upper, fore, hands; the back hand is a fist at the end of the forearm
    for side, z in (('b', -6.0), ('f', 6.0)):
        sh, el = R[side + 'upper'], R[side + 'fore']
        G[side + 'upper'].ball((sh[0], sh[1], z), (2.9, 2.9, 2.9), SLEEVE[0], 6, 4)
        G[side + 'upper'].tube(sh, el, 2.6, 2.3, SLEEVE[0], 6, 1.0, z, ring_cols=lambda k: SLEEVE[k % 2])
        G[side + 'fore'].ball((el[0], el[1], z), (2.3, 2.3, 2.3), SLEEVE[0], 6, 4)
    bel = R['bfore']; G['bfore'].tube(bel, (bel[0] + 1, bel[1] + 7), 2.3, 2.1, SLEEVE[0], 6, 1.0, -6.0, ring_cols=lambda k: SLEEVE[k % 2])
    G['bfore'].tube((bel[0] + 0.9, bel[1] + 6), (bel[0] + 1.1, bel[1] + 7.2), 2.5, 2.5, YEL, 6, 1.0, -6.0)                # (a yellow cuff)
    G['bfore'].ball((bel[0] + 1.2, bel[1] + 8.9, -6.0), (3.2, 3.2, 3.0), SKINC, 8, 5)                                 # big cartoon hands
    fel, fh = R['ffore'], R['ffist']
    G['ffore'].tube(fel, fh, 2.3, 2.1, SLEEVE[0], 6, 1.0, 6.0, ring_cols=lambda k: SLEEVE[k % 2])
    cf = (fel[0] + (fh[0] - fel[0]) * 0.8, fel[1] + (fh[1] - fel[1]) * 0.8)
    G['ffore'].tube(cf, fh, 2.5, 2.4, YEL, 6, 1.0, 6.0)                                                             # (a yellow cuff)
    # the front fist and the karambit: a ring through her finger, a claw-curved crystal blade (a real slab, 1.4 px thick)
    G['ffist'].ball((fh[0], fh[1] + 0.5, 6.3), (3.3, 3.3, 3.0), SKINC, 8, 5)
    ring = [(fh[0] + 0.5 + 2.6 * math.cos(a), fh[1] - 5 + 2.6 * math.sin(a)) for a in (2 * math.pi * k / 8 for k in range(8))]
    for k in range(8): G['ffist'].tube(ring[k], ring[(k + 1) % 8], 0.55, 0.55, 0x8a8a96, 4, 1.0, 6.6, keep=True)
    G['ffist'].tube((fh[0] + 1, fh[1]), (fh[0] + 2.5, fh[1] + 1.5), 1.2, 1.2, 0x16161c, 4, 1.0, 6.4, keep=True)       # the grip
    outer = [(46, 26), (49, 26), (52, 27), (54, 30), (55, 33), (54, 36), (52, 39)]
    inner = [(52, 36), (52, 33), (51, 31), (49, 29), (47, 29)]
    G['ffist'].slab(outer + inner, 6.0, 7.4, CRYS[1], keep=True)
    G['ffist'].slab(inner + [(47, 28), (49, 27.6), (51, 29), (52.6, 31), (53.4, 33.5), (53.2, 36)], 7.4, 7.7, 0xffffff, keep=True)   # (the edge's shine)
    # head: a low-poly skull (face skin in front, hair over the top and back), a fringe, a ponytail, painted-on eyes and smile
    hc = (36.5, 11.5, 0.0)                                                       # (a big cartoon head, a little higher)
    def headcol(n):
        if n[0] > 0.25 and n[1] > -0.45: return SKINC                              # her face (she faces +x)
        return HAIRC
    G['head'].ball(hc, (9.6, 10.0, 8.8), HAIRC, 12, 8, colfn=headcol)
    G['head'].tube((neck[0] + 1, neck[1]), (neck[0] + 2, neck[1] - 4), 2.2, 2.4, SKINC, 6, 1.0)                    # neck
    G['head'].ball((hc[0] + 1.6, hc[1] - 7.0, 0), (7.4, 3.4, 9.0), HAIRC, 10, 5)                                     # the fringe, over the brow
    pts = [(29.5, 10), (27.5, 16), (26.5, 22), (26.5, 28)]
    for k in range(3): G['head'].tube(pts[k], pts[k + 1], 3.6 - k * 0.9, 3.0 - k * 0.9, HAIRC, 6, 0.9, -1.0)      # the ponytail
    drowned = stage == 3
    def oval(cx, cy, rx, ry, n=8): return [(cx + rx * math.cos(2 * math.pi * k / n), cy + ry * math.sin(2 * math.pi * k / n)) for k in range(n)]
    for ez in (3.1, -3.1):                                                       # big, round cartoon eyes (rounded white, a big pupil, a shine)
        ex = hc[0] + 7.9; ey = hc[1] - 0.4
        G['head'].slab(oval(ex, ey, 1.0, 2.4), ez - 1.6, ez + 1.6, GLITCH[0] if drowned else WHITE, keep=True)
        G['head'].slab(oval(ex + 0.7, ey + 0.4, 0.8, 1.5), ez - 0.9, ez + 1.0, GLITCH[1] if drowned else 0x1a2a8a, keep=True)
        G['head'].slab(oval(ex + 1.1, ey + 0.5, 0.6, 1.0, 6), ez - 0.6, ez + 0.7, 0xffffff if drowned else BLK, keep=True)
        if not drowned:
            G['head'].slab(oval(ex + 1.4, ey - 0.7, 0.4, 0.5, 5), ez + 0.2, ez + 0.9, WHITE, keep=True)                 # (the shine)
            G['head'].slab([(ex - 0.6, ey - 3.6), (ex + 1.6, ey - 3.9), (ex + 1.6, ey - 3.2), (ex - 0.6, ey - 2.9)], ez - 1.4, ez + 1.4, 0xc8481a, keep=True)   # brows
    grin = 3.6 + stage * 1.2                                                     # the smile, wider each stage (DROWNED: a white grin)
    G['head'].slab([(hc[0] + 8.0, hc[1] + 4.4), (hc[0] + 9.6, hc[1] + 4.4), (hc[0] + 9.2, hc[1] + 6.0), (hc[0] + 7.8, hc[1] + 6.0)], -grin / 2, grin / 2, WHITE if drowned else 0x9a1a1a, keep=True)
    if stage >= 1:                                                               # sludge dripping off her head and shoulders
        for k, (dx, dz) in enumerate(((-3, 4), (0, -5), (3, 3), (-5, -2))[:stage + 1]):
            G['head'].tube((hc[0] + dx, hc[1] - 3), (hc[0] + dx, hc[1] + 6 + k * 2), 1.4, 0.4, SLD[1], 4, 1.0, dz, keep=True)
    if drowned:                                                                  # DROWNED: one giant low-poly demon wing off her back
        root = (29, 23); tips = [(12, 0), (2, 0), (0, 14), (3, 28), (10, 38)]
        for k in range(len(tips) - 1):
            G['scarf'].slab([root, tips[k], tips[k + 1]], -9.6 - k * 0.3, -9.0 - k * 0.3, SLD[1] if k % 2 else SLD[2], keep=True)
        for tp in tips: G['scarf'].tube(root, tp, 0.9, 0.4, 0x4a3248, 4, 1.0, -8.8, keep=True); G['scarf'].ball((tp[0], tp[1], -8.8), (0.9, 0.9, 0.9), GLITCH[0], 4, 3, keep=True)
    return G


def palette_material():
    """One material for the whole model: each face's own colour (a face-corner colour attribute) times a flat key
    light from the upper left-front plus ambient, in steps (an emission shader: crisp, one sample per pixel)."""
    m = bpy.data.materials.new('devoted_cartridge'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    l = np.array(LIGHT); l = l / np.linalg.norm(l); dot.inputs[1].default_value = tuple(l)
    L.new(geo.outputs['Normal'], dot.inputs[0])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; mx.inputs[1].default_value = 0.0; L.new(dot.outputs['Value'], mx.inputs[0])
    lit = nt.nodes.new('ShaderNodeMath'); lit.operation = 'MULTIPLY_ADD'; lit.inputs[1].default_value = 0.7; lit.inputs[2].default_value = 0.45; L.new(mx.outputs['Value'], lit.inputs[0])
    sn = lit                                                                   # (smooth Gouraud light - no steps)
    cmb = nt.nodes.new('ShaderNodeCombineColor')
    for i in range(3): L.new(sn.outputs['Value'], cmb.inputs[i])
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    L.new(ca.outputs['Color'], mul.inputs[6]); L.new(cmb.outputs['Color'], mul.inputs[7])
    em = nt.nodes.new('ShaderNodeEmission'); L.new(mul.outputs[2], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return m


def build_scene(layers, stage=0):
    """Her model in Blender: one object per rig part, built by model() - real geometry, coloured per face."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1; sc.cycles.use_denoising = False
    sc.cycles.pixel_filter_type = 'BOX'; sc.cycles.filter_width = 0.01
    sc.cycles.max_bounces = 0; sc.cycles.transparent_max_bounces = 8
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.resolution_percentage = 100
    mat = palette_material(); objs = {}
    for name, g in model(stage).items():
        if not g.f: continue
        me = bpy.data.meshes.new(name)
        me.from_pydata([(x, -y, z) for x, y, z in g.v], [], g.f); me.update()
        attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
        for poly, rgb in zip(me.polygons, g.c):
            c = ((rgb >> 16 & 255) / 255, (rgb >> 8 & 255) / 255, (rgb & 255) / 255, 1.0)
            c = tuple(v ** 2.2 for v in c[:3]) + (1.0,)                                         # (sRGB -> linear)
            for li in poly.loop_indices: attr.data[li].color = c
        for poly, sm in zip(me.polygons, g.s): poly.use_smooth = sm
        me.materials.append(mat)
        ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); objs[name] = ob
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
        ob.matrix_world = Matrix(((a, -b, 0, tx), (-c, d, 0, -ty), (0, 0, s, 0), (0, 0, 0, 1)))
        ob.hide_render = name in hide


def aim(cam, rig):
    """The orthographic camera framing the rig's canvas, turned YAW toward her front, centred on her feet's column."""
    W, H = rig.canvas
    sc = bpy.context.scene; sc.render.resolution_x = W; sc.render.resolution_y = H; sc.render.resolution_percentage = SS * 100
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
    big = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    H, W = big.shape[0] // SS, big.shape[1] // SS
    big[..., :3] *= big[..., 3:4] / 255                                          # (premultiply, average SS x SS blocks, un-premultiply)
    sm = big.reshape(H, SS, W, SS, 4).mean((1, 3))
    al = sm[..., 3:4]; sm[..., :3] = np.where(al > 0, sm[..., :3] * 255 / np.maximum(al, 1e-3), 0)
    img = np.clip(sm, 0, 255).astype(np.uint8)
    a = img[..., 3] > 110
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
    objs, cam = build_scene(layers, i)
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
