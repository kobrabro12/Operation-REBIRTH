"""HANZ / $@L, THE TRUE SHOPKEEPER, as a real low-poly 3D model in Blender (`pip install bpy`, Blender 5.x).

The look: a few big flat angular planes (every part is the convex hull of a handful of points), thin black ink lines
on the silhouette and the sharp creases (Blender's Freestyle), bold flat colour per face lit in two hard steps, and
a speckled grain over everything (denser in the shadow).

Him: one lanky man split straight down the middle. HANZ (the LEFT of the picture) is tired, sad and smart: pale GREY.
$@L (the right) is sneaky, quick to anger and foolish: blood RED. The split runs through his face, his hands and the
lining of his coat. His face is a big flat plate framed by black hair like a helmet, and on it is Mason's drawing
(tools/sprites/art/hanz_face.png, 64x64, black lines) as a pixel texture: HANZ's heavy drooping eye, $@L's beady eye
in spiral rings, a crooked grin across both. He wears a thick, heavy anime trench coat: a huge popped collar round
his head (lined grey on HANZ's side, red on $@L's), wide lapels, double-breasted buttons, a belt, epaulettes, wide
cuffs with straps. He's too calm: perfectly still, head a little tilted, leaning over a heavy old shop counter on
long arms with his hands flat on the wood.

Run:  python3 tools/sprites/hanz_3d.py --out DIR [--pose lean|stand]
      -> preview shots in DIR (game.png = framed like the LOST room, 640x360) and the scene saved as
         tools/sprites/art/hanz.blend for opening in Blender.
"""
import os, sys, math, argparse
import numpy as np
from PIL import Image
from scipy.spatial import ConvexHull
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(__file__)
FACE = os.path.join(HERE, 'art', 'hanz_face.png')
BLEND = os.path.join(HERE, 'art', 'hanz.blend')

# ------------------------------------------------------------------ colours (bold and flat, one per face)
GREY = 0xd2d0cc; GREY_D = 0xa8a6a2           # HANZ: pale, drained of colour
RED = 0xb8121c; RED_D = 0x860a12             # $@L: blood red
COAT = 0x2b2a33; COAT2 = 0x3a3944; COAT3 = 0x1e1d25   # the trench coat: heavy charcoal
BELT = 0x161519; BRASS = 0xc8a040; BRASS2 = 0x8a6a28
HAIR = 0x101013
WOOD = 0x6a4028; WOOD2 = 0x80502e; WOOD3 = 0x4a2c1c
CLOCK = 0xe8e0c8; GREEN = 0x3a6a4a; INKC = 0x101012
INK = (0.0, 0.0, 0.0)

# ------------------------------------------------------------------ building meshes
class Mesh:
    """A part being built: vertices (Blender axes: x right, y away from the camera, z up), polygons, a colour per
    polygon, and which polygons carry the face texture (with their UVs)."""
    def __init__(self):
        self.v, self.f, self.c, self.uv = [], [], [], {}

    def hull(self, pts, col, M=None, split=None, uvface=None):
        """The convex hull of pts (a hard-faceted solid). col = a colour, or colfn(centroid, normal) -> colour.
        M = a 4x4 transform applied to the points. Neighbouring coplanar triangles are merged so Freestyle doesn't
        draw lines across flat faces. uvface(centroid, normal) -> True puts the face texture on that polygon."""
        P = np.array(pts, float)
        if M is not None: P = np.array([(M @ Vector(p)).to_tuple() for p in P])
        h = ConvexHull(P)
        o = len(self.v); self.v += [tuple(p) for p in P]
        ctr = P.mean(0)
        for tri, eq in zip(h.simplices, h.equations):
            a, b, c = P[tri]
            n = eq[:3]
            if np.dot(np.cross(b - a, c - a), n) < 0: tri = tri[[0, 2, 1]]          # (wind outward)
            cen = P[tri].mean(0)
            self.f.append([o + int(i) for i in tri])
            self.c.append(col(cen, n) if callable(col) else col)
            if uvface and uvface(cen, n): self.uv[len(self.f) - 1] = True

    def box(self, c, s, col, M=None):
        """A box centred on c with size s (x, y, z), as a hull."""
        x, y, z = c; a, b, d = s[0] / 2, s[1] / 2, s[2] / 2
        self.hull([(x + i * a, y + j * b, z + k * d) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)], col, M)

    def limb(self, p0, p1, r0, r1, col, sides=4, twist=0.0, M=None):
        """An angular limb: a hull of two n-gon rings from p0 to p1 (4 sides = a hard square sleeve)."""
        p0, p1 = np.array(p0, float), np.array(p1, float)
        d = p1 - p0; d /= np.linalg.norm(d)
        u = np.cross(d, (0, 0, 1)); u = u / np.linalg.norm(u) if np.linalg.norm(u) > 1e-3 else np.array((1, 0, 0))
        w = np.cross(d, u)
        pts = []
        for p, r in ((p0, r0), (p1, r1)):
            for k in range(sides):
                a = twist + 2 * math.pi * (k + 0.5) / sides
                pts.append(p + r * (math.cos(a) * u + math.sin(a) * w))
        self.hull(pts, col, M)

    def slab(self, pts2, y0, y1, col, M=None):
        """A flat cut-out shape (x, z points) given thickness from y0 to y1 - a lapel, a tie, a tag."""
        self.hull([(x, y, z) for x, z in pts2 for y in (y0, y1)], col, M)


def side(col_h, col_s, cut=0.0):
    """A colour function: HANZ's colour left of x=cut, $@L's right of it."""
    return lambda c, n: col_h if c[0] < cut else col_s


# ------------------------------------------------------------------ him
FACE_X, FACE_Z = 18, (-21, 20)                    # the face plate: half its width, and its bottom / top
HEAD_SCALE = 0.8                                  # the head's size on his body
FACE_SPLIT = 31                                   # the drawing's column between his two eyes = where grey turns red
# the face texture's straight front projection (x0, x1, z0, z1 = where u / v run 0..1): column FACE_SPLIT lands on
# x = 0, the plate's edges on the drawing's edges, its top / bottom on rows 2 / 52
FACE_UV = (-FACE_X, FACE_X * (64 - FACE_SPLIT) / FACE_SPLIT, FACE_Z[1] - 62 * (FACE_Z[1] - FACE_Z[0]) / 50, FACE_Z[1] + 2 * (FACE_Z[1] - FACE_Z[0]) / 50)


def head(M):
    """His head: a big flat face plate (the face texture covers its whole front - grey left, red right) on a shallow
    head, framed by black hair like a helmet: a heavy fringe in three big points over the brow, long flat side panels
    down past the jaw that end in points, a cowlick of two shards on top."""
    m = Mesh()
    z0, z1 = FACE_Z
    front = [(-FACE_X, -11, z1), (FACE_X, -11, z1), (-FACE_X - 1, -11, 3), (FACE_X + 1, -11, 3),
             (-13, -10, -15), (13, -10, -15), (-5, -9, z0), (5, -9, z0)]
    back = [(x * 0.88, 10, z * 0.92) for x, _, z in front]
    is_front = lambda c, n: n[1] < -0.9
    m.hull(front + back, lambda c, n: (GREY if c[0] < 0 else RED), M, uvface=is_front)
    # hair: top block, a fringe of three big points, the side panels, the back
    m.hull([(-23, -14, 19), (23, -14, 19), (-23, 12, 18), (23, 12, 18), (-20, -13, 30), (20, -13, 30), (-19, 11, 29), (19, 11, 29)], HAIR, M)
    for (x0, x1, tipx, tipz) in ((-19, -6, -14, 12), (-7, 6, 1, 14), (5, 19, 13, 11)):
        m.hull([(x0, -15, 21), (x1, -15, 21), (x0, -12, 21), (x1, -12, 21), (tipx, -14.5, tipz), (tipx, -12.5, tipz)], HAIR, M)
    for sx in (-1, 1):
        m.hull([(sx * 18.5, -14, 22), (sx * 25, -14, 22), (sx * 18.5, 11, 22), (sx * 25, 11, 21),
                (sx * 18.5, -13, -12), (sx * 23, -11, -14), (sx * 19, 8, -10), (sx * 20, -12, -24)], HAIR, M)
    m.hull([(-20, 9, 26), (20, 9, 26), (-19, 13, -6), (19, 13, -6), (-16, 12, 18), (16, 12, 18)], HAIR, M)
    m.hull([(2, -6, 29), (8, -4, 29), (5, 4, 29), (11, -9, 39)], HAIR, M)          # the cowlick
    m.hull([(6, -3, 29), (11, -1, 29), (8, 6, 29), (16, -2, 35)], HAIR, M)
    return m


def coat(M):
    """His chest and shoulders in the thick trench coat: a narrow lanky torso, a huge popped collar rising round his
    head (lined grey on HANZ's side, red on $@L's), wide lapels, two rows of brass buttons, a belt and buckle,
    epaulettes, and the coat's skirt flaring below the belt."""
    m = Mesh()
    pts = []
    for z, w, d in ((-30, 21, 12), (0, 15, 9), (14, 14, 9), (32, 18, 10), (42, 25, 10), (47, 21, 8)):
        pts += [(x, y, z) for x in (-w, w) for y in (-d, d)]
    m.hull(pts, lambda c, n: COAT2 if n[1] < -0.5 else COAT, M)
    # the popped collar: two thick flared walls; faces turned inward show the lining
    for sx in (-1, 1):
        lining = GREY_D if sx < 0 else RED_D
        m.hull([(sx * 5, -9, 42), (sx * 5, 7, 44), (sx * 20, -7, 45), (sx * 20, 7, 45),
                (sx * 13, -12, 68), (sx * 24, -8, 70), (sx * 23, 7, 68), (sx * 9, 2, 70),
                (sx * 16, -11, 69), (sx * 21, 4, 69)],
               lambda c, n, sx=sx, lining=lining: lining if n[0] * sx < -0.35 or n[1] > 0.6 else COAT, M)
    # wide lapels over the chest, crossing for the double breast
    m.slab([(-3, 42), (-17, 41), (-12, 22), (2, 12)], -11.5, -9.5, COAT2, M)
    m.slab([(3, 42), (17, 41), (12, 22), (-1, 12)], -12.5, -10.5, COAT2, M)
    m.slab([(-4, 41), (4, 41), (2, 33), (-2, 33)], -10.8, -9.2, COAT3, M)            # dark collar opening
    for bx in (-6, 6):
        for bz in (28, 21):
            m.box((bx, -12.6, bz), (2.4, 1.2, 2.4), BRASS, M)
    # belt + buckle, epaulettes
    m.hull([(x, y, z) for x in (-16, 16) for y in (-10.5, 10.5) for z in (6, 11)], BELT, M)
    m.box((0, -11.2, 8.5), (6, 1.4, 6), BRASS, M); m.box((0, -11.6, 8.5), (3, 1.2, 3), BELT, M)
    for sx in (-1, 1):
        m.slab([(sx * 12, 46.5), (sx * 25, 44.5), (sx * 25, 42.5), (sx * 12, 44.5)], -5, 5, COAT3, M)
    # the neck (mostly hidden in the collar)
    m.limb((0, 1, 44), (0, 1, 55), 5, 4.5, lambda c, n: GREY_D if c[0] < 0 else RED_D, sides=4, M=M)
    return m


def arm(M, s, shoulder, elbow, wrist, hand_dir):
    """One long arm in a wide trench sleeve (a big flat shoulder, a sleeve that flares at the cuff, a strap round the
    cuff) and a long-fingered hand: grey for HANZ (s = -1), red for $@L (s = +1)."""
    m = Mesh()
    skin, skin_d = (GREY, GREY_D) if s < 0 else (RED, RED_D)
    m.hull([(shoulder[0] + dx * 7, shoulder[1] + dy * 9, shoulder[2] + dz * 6) for dx in (-1, 1) for dy in (-1, 1) for dz in (-1, 1)], COAT, M)
    m.limb(shoulder, elbow, 7.5, 6.5, COAT, sides=4, twist=0.4, M=M)
    e, w = np.array(elbow, float), np.array(wrist, float)
    cuff = e + (w - e) * 0.86
    m.limb(elbow, tuple(cuff), 6.5, 8, COAT2, sides=4, twist=0.2, M=M)
    m.limb(tuple(e + (w - e) * 0.7), tuple(e + (w - e) * 0.78), 8.2, 8.4, BELT, sides=4, twist=0.2, M=M)   # the cuff strap
    m.limb(tuple(cuff), wrist, 3.4, 3.4, skin_d, sides=4, M=M)
    d = np.array(hand_dir, float); d /= np.linalg.norm(d)
    u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u)
    palm_end = w + d * 10
    m.hull([tuple(p + u * a + np.array((0, 0, z))) for p in (w, palm_end) for a in (-5, 5) for z in (-1.8, 1.8)], skin, M)
    for i, a in enumerate((-3.9, -1.3, 1.3, 3.9)):                                   # long fingers flat on the wood
        base = palm_end + u * a
        tip = base + d * (10 + (2 if i in (1, 2) else 0)) + u * a * 0.3 + np.array((0, 0, -1.2))
        m.limb(tuple(base), tuple(tip), 1.5, 1.2, skin, sides=4, M=M)
    m.limb(tuple(w + u * 5 * -s + d * 2), tuple(w + u * 11 * -s + d * 6 + np.array((0, 0, -1))), 1.8, 1.4, skin_d, sides=4, M=M)
    return m


def counter():
    """His shop counter: a heavy wooden top with a front panel of raised boards, a brass bell, an old till, and a
    pocket watch melting over the front edge (one of the dream's melting things)."""
    m = Mesh()
    m.box((0, 0, -2), (150, 44, 5), WOOD2)                                       # the top
    m.box((0, -20, -6), (154, 6, 4), WOOD)                                        # its front lip
    m.box((0, 0, -40), (144, 38, 70), WOOD3)                                      # the body
    for i in range(-2, 3):                                                         # raised boards on the front
        m.box((i * 27, -19.5, -40), (23, 1.5, 58), WOOD if i % 2 else WOOD2)
    # the bell
    m.hull([(-58 + 6 * math.cos(a), -6 + 6 * math.sin(a), 0.5) for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
           + [(-58 + 3 * math.cos(a), -6 + 3 * math.sin(a), 6) for a in np.linspace(0, 2 * math.pi, 7)[:-1]], BRASS, None)
    m.box((-58, -6, 7.5), (1.6, 1.6, 3), BRASS2)
    # the till
    m.hull([(46, -6, 0.5), (70, -6, 0.5), (46, 16, 0.5), (70, 16, 0.5), (48, 2, 24), (68, 2, 24), (48, 16, 28), (68, 16, 28)], GREEN)
    for i in range(3):
        for j in range(3):
            m.box((51 + i * 7, -2 + j * 3, 6 + j * 4), (4, 2.5, 1.6), CLOCK)
    m.slab([(51, 28), (65, 28), (65, 35), (51, 35)], 12, 13.5, CLOCK)
    # the melting watch: a disc on the counter that sags over the edge and drips down the front
    rim = []
    for k in range(10):
        a = 2 * math.pi * k / 10
        x, y = 14 * math.cos(a), 9 * math.sin(a) - 12
        z = 0.6
        if y < -17: z = 0.6 - (abs(y) - 17) * 3; y = -21.5                       # (the part past the edge hangs down)
        rim.append((x - 34, y, z))
    m.hull(rim + [(p[0] * 0.85 - 6.6, p[1], p[2] + 1.6) for p in rim], CLOCK)
    m.hull([(-40, -22.5, -6), (-30, -22.5, -6), (-36, -23.5, -20), (-35, -22.0, -26), (-34, -23, -14)], CLOCK)   # the drip
    m.hull([(p[0], p[1], p[2] - 0.4) for p in rim] + [(p[0] * 1.08 + 2.7, p[1] * 1.05 - (0.6 if p[1] > -20 else 0), p[2] + 0.6) for p in rim], BRASS)   # its gold case (under the face)
    for k in range(12):                                                             # hour marks (the ones past the edge slide down with it)
        a = 2 * math.pi * k / 12; x, y = -34 + 11 * math.cos(a), 8 * math.sin(a) - 12
        z = 2.4
        if y < -17: z = 2.4 - (abs(y) - 17) * 3; y = -22.2
        m.box((x, y, z), (1.4, 1.4, 0.6), INKC)
    m.box((-31, -12, 2.6), (7, 1, 0.6), INKC); m.box((-34.5, -9.5, 2.6), (1, 5, 0.6), INKC)                         # its hands
    return m


INKC = 0x101012


# ------------------------------------------------------------------ Blender scene
def material(face_img=None):
    """Flat colour per face lit in three hard steps from one key light (no smooth shading anywhere), with film grain
    in the two darker steps. With face_img: the colour comes from Mason's face drawing over the split teal / rust
    skin instead (closest-pixel sampling, so it stays crisp pixel art on the 3D head)."""
    mt = bpy.data.materials.new('face' if face_img else 'flat'); mt.use_nodes = True
    nt = mt.node_tree; nt.nodes.clear(); L = nt.links
    if face_img:
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = face_img; tex.interpolation = 'Closest'
        uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UV'; L.new(uv.outputs['UV'], tex.inputs['Vector'])
        base = tex.outputs['Color']
    else:
        ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'; base = ca.outputs['Color']
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    l = np.array((-0.45, -0.7, 0.55)); dot.inputs[1].default_value = tuple(l / np.linalg.norm(l))
    L.new(geo.outputs['Normal'], dot.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (0.6, 0.6, 0.64, 1)                    # shadow
    els[1].position = 0.5; els[1].color = (1.0, 1.0, 1.0, 1)                     # lit
    remap = nt.nodes.new('ShaderNodeMapRange'); remap.inputs['From Min'].default_value = -1; L.new(dot.outputs['Value'], remap.inputs['Value'])
    L.new(remap.outputs['Result'], ramp.inputs['Fac'])
    # grain: sparse dark speckles everywhere, denser where it's in shadow (threshold 0.98 lit / 0.82 shadow)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexWhiteNoise'); nz.noise_dimensions = '3D'
    sc = nt.nodes.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.inputs['Scale'].default_value = 1.6
    L.new(tc.outputs['Object'], sc.inputs[0]); L.new(sc.outputs['Vector'], nz.inputs['Vector'])
    lvl = nt.nodes.new('ShaderNodeMath'); lvl.operation = 'MULTIPLY_ADD'; lvl.inputs[1].default_value = 0.4; lvl.inputs[2].default_value = 0.58
    sep = nt.nodes.new('ShaderNodeSeparateColor'); L.new(ramp.outputs['Color'], sep.inputs['Color'])
    L.new(sep.outputs[0], lvl.inputs[0])                                          # (0.6 -> 0.7, 1.0 -> 0.9)
    th = nt.nodes.new('ShaderNodeMath'); th.operation = 'GREATER_THAN'
    L.new(nz.outputs['Value'], th.inputs[0]); L.new(lvl.outputs['Value'], th.inputs[1])
    gr = nt.nodes.new('ShaderNodeMath'); gr.operation = 'MULTIPLY_ADD'; gr.inputs[1].default_value = -0.35; gr.inputs[2].default_value = 1.0
    L.new(th.outputs['Value'], gr.inputs[0])
    m1 = nt.nodes.new('ShaderNodeMix'); m1.data_type = 'RGBA'; m1.blend_type = 'MULTIPLY'; m1.inputs['Factor'].default_value = 1
    L.new(base, m1.inputs[6]); L.new(ramp.outputs['Color'], m1.inputs[7])
    m2 = nt.nodes.new('ShaderNodeVectorMath'); m2.operation = 'SCALE'
    L.new(m1.outputs[2], m2.inputs[0]); L.new(gr.outputs['Value'], m2.inputs['Scale'])
    em = nt.nodes.new('ShaderNodeEmission'); L.new(m2.outputs['Vector'], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return mt


def face_image():
    """Mason's face drawing over the split skin: grey left of FACE_SPLIT, red right of it, his black lines on top."""
    src = np.array(Image.open(FACE).convert('RGBA'))
    H, W = src.shape[:2]
    img = np.zeros((H, W, 4), np.uint8); img[..., 3] = 255
    t = [GREY >> 16 & 255, GREY >> 8 & 255, GREY & 255]; r = [RED >> 16 & 255, RED >> 8 & 255, RED & 255]
    img[:, :FACE_SPLIT, :3] = t; img[:, FACE_SPLIT:, :3] = r
    ink = src[..., 3] > 0
    img[ink, :3] = (16, 14, 18)
    path = os.path.join(bpy.app.tempdir or '/tmp', 'hanz_face_tex.png'); Image.fromarray(img).save(path)
    im = bpy.data.images.load(path); im.colorspace_settings.name = 'sRGB'
    return im


def to_object(name, m, mats, face_box=None):
    """Turns a Mesh into a Blender object: flat-shaded, a colour per polygon, and for the head the face texture's
    UVs (a straight projection from the front over face_box = (x0, x1, z0, z1))."""
    me = bpy.data.meshes.new(name); me.from_pydata(m.v, [], m.f); me.update()
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    uvl = me.uv_layers.new(name='UV')
    for poly, rgb in zip(me.polygons, m.c):
        c = tuple(((rgb >> s & 255) / 255) ** 2.2 for s in (16, 8, 0)) + (1.0,)
        for li in poly.loop_indices:
            attr.data[li].color = c
            if face_box:
                x, _, z = m.v[me.loops[li].vertex_index]
                x0, x1, z0, z1 = face_box
                uvl.data[li].uv = ((x - x0) / (x1 - x0), (z - z0) / (z1 - z0))
        poly.use_smooth = False
        poly.material_index = 1 if (face_box and m.uv.get(poly.index)) else 0
    for mt in mats: me.materials.append(mt)
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def T(x=0, y=0, z=0, rx=0, ry=0, rz=0):
    """A transform: rotate (degrees, X then Y then Z) then move."""
    R = Matrix.Rotation(math.radians(rz), 4, 'Z') @ Matrix.Rotation(math.radians(ry), 4, 'Y') @ Matrix.Rotation(math.radians(rx), 4, 'X')
    return Matrix.Translation((x, y, z)) @ R


def build(pose='lean'):
    """The whole set: him (posed) behind the counter. pose: 'lean' = on his elbows on the counter, head forward
    looking at you; 'stand' = upright, arms down on the counter top."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1; sc.cycles.use_denoising = False
    sc.cycles.pixel_filter_type = 'BOX'; sc.cycles.filter_width = 0.01; sc.cycles.max_bounces = 0
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    # ink lines: Freestyle on the silhouette, creases and borders
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.3
    vl = sc.view_layers[0]; fs = vl.freestyle_settings; fs.crease_angle = math.radians(140)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_crease = True; ls.select_border = True
    ls.select_contour = True; ls.select_external_contour = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = INK; ls.linestyle.thickness = 1.3
    flat = material(); facem = material(face_image())
    lean = pose == 'lean'
    body = T(0, 30, -15, rx=32 if lean else 4)                                   # hips behind the counter, chest tipped over it toward you
    neck_top = body @ Vector((0, 1, 54))
    head_M = T(*neck_top) @ T(0, -4, 14, rx=6 if lean else 0, ry=-7) @ Matrix.Scale(HEAD_SCALE, 4)   # (perfectly calm, head tilted a little - just slightly off)
    to_object('coat', coat(body), [flat])
    hm = head(Matrix.Identity(4))                                                 # (built at rest so the face UVs are a straight front projection)
    ob = to_object('head', hm, [flat, facem], face_box=FACE_UV)
    ob.matrix_world = head_M
    for s in (-1, 1):
        sh = body @ Vector((s * 23, 0, 42))
        if lean:
            el = Vector((s * 42, -2, 16)); wr = Vector((s * 27, -10, 2.5)); hdir = (-s * 0.2, -1, 0)   # hands planted wide and flat, elbows out: leaning over the counter at you
        else:
            el = body @ Vector((s * 31, 2, 14)); wr = Vector((s * 30, -8, 2.5)); hdir = (0, -1, 0)
        to_object('arm_' + ('hanz' if s < 0 else 'sal'), arm(None, s, tuple(sh), tuple(el), tuple(wr), hdir), [flat])
    to_object('counter', counter(), [flat])
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50; cam.data.clip_end = 5000
    return cam, head_M


def shot(cam, path, w, h, loc, target, lens=50):
    """Renders one view: camera at loc looking at target."""
    sc = bpy.context.scene; sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    cam.location = loc; cam.data.lens = lens
    d = Vector(target) - Vector(loc); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--pose', default='lean')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    cam, hm = build(a.pose)
    face = hm @ Vector((0, 0, 0))
    shot(cam, os.path.join(a.out, 'front.png'), 480, 480, (0, -240, 70), (0, 0, 22), 50)
    shot(cam, os.path.join(a.out, 'close.png'), 400, 400, (0, -120, face.z + 8), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'hanz.png'), 400, 400, (-95, -95, face.z + 10), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'sal.png'), 400, 400, (95, -95, face.z + 10), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'wide.png'), 640, 360, (-120, -300, 120), (0, 0, 20), 45)
    shot(cam, os.path.join(a.out, 'game.png'), 640, 360, (0, -190, 64), (0, 0, 26), 38)        # (how the LOST room frames him)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
