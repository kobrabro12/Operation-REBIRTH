"""HANZ / $@L, THE TRUE SHOPKEEPER, as a real low-poly 3D model in Blender (`pip install bpy`, Blender 5.x).

The look: angular, flat-shaded polygons (every part is the convex hull of a few points, so it's all hard facets),
thick black ink lines on the silhouette and on every sharp crease (Blender's Freestyle), flat colour per face lit in
three hard steps, and film grain in the shadows.

Him: one man, two halves split straight down the middle. HANZ (the LEFT of the picture) is tired, sad and smart - faded TEAL skin, a neat dark suit, combed hair. $@L (the right of the
picture) is sneaky, quick to anger and foolish - rust RED skin, the same suit torn and stained, hair in spikes. His
face is Mason's drawing (tools/sprites/art/hanz_face.png, 64x64, black lines) laid on the front of the head as a
pixel texture: HANZ's heavy drooping eye, $@L's beady eye in spiral rings, a crooked grin across both.

He stands behind a heavy old shop counter and leans on it on his elbows. The counter carries a bell, a till and a
clock melting over its front edge.

Run:  python3 tools/sprites/hanz_3d.py [--out DIR] [--shots front,hanz,sal,lean,wide]
      -> renders preview shots to DIR (default the scratch folder you pass) and saves the scene as
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

# ------------------------------------------------------------------ colours (flat, picked per face)
TEAL = 0x5f9a96; TEAL_D = 0x41706e            # HANZ's skin: a faded, washed-out teal
RUST = 0xc0472a; RUST_D = 0x8a2e18            # $@L's skin: a hot rust red
SUIT_H = 0x2e3a40; SUIT_H2 = 0x3c4a52         # HANZ's half of the suit: neat, dark slate
SUIT_S = 0x4a2a22; SUIT_S2 = 0x5e3428         # $@L's half: the same suit gone brown, torn
SHIRT = 0xe6dcc4; SHIRT_D = 0xc8bca0          # an old cream shirt
TIE_H = 0x2a5a58; TIE_S = 0x9a2a1a            # the tie, half and half
HAIR = 0x15151a
WOOD = 0x6a4028; WOOD2 = 0x80502e; WOOD3 = 0x4a2c1c; BRASS = 0xc8a040; BRASS2 = 0x8a6a28
CLOCK = 0xe8e0c8; GREEN = 0x3a6a4a
INK = (0.03, 0.03, 0.04)


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
def head(M):
    """His head: an angular hull - a flat brow, high cheekbones, a narrow pointed jaw - its front a slight wedge
    down the middle, split teal / rust. The front faces carry the face texture. Hair: HANZ's side combed flat and
    neat, $@L's side a mess of spikes."""
    m = Mesh()
    pts = []
    for z, w, fy, by in ((17, 12, -9, 10), (12, 15, -12, 12), (2, 15, -13, 12), (-7, 13, -12, 10), (-14, 8, -10, 6), (-18, 3, -8, 3)):
        for x in (-w, -w * 0.5, 0, w * 0.5, w):
            front = fy - (1.6 if x == 0 else 0) + abs(x) / max(w, 1) * 2.5
            pts += [(x, front, z), (x * 0.92, by, z)]
    front_face = lambda c, n: n[1] < -0.55 and -16 < c[2] < 15
    m.hull(pts, lambda c, n: (TEAL if c[0] < 0 else RUST), M, uvface=front_face)
    # ears
    m.hull([(-15.5, -1, 5), (-18, 2, 3), (-15.5, 4, 6), (-15.5, 1, -4), (-17, 2, -2)], TEAL_D, M)
    m.hull([(15.5, -1, 5), (18.5, 2, 2), (15.5, 4, 6), (15.5, 1, -4), (18, 2, -3)], RUST_D, M)
    # HANZ's hair: a smooth combed wedge lying flat over the left of his skull
    m.hull([(-16, -10, 13), (-1, -11, 18), (-1, 12, 17), (-16, 12, 10), (-14, -6, 21), (-1, -7, 22), (-1, 9, 21), (-14, 9, 17)], HAIR, M)
    # $@L's hair: jagged spikes going every way
    for (bx, bz, tx, ty, tz) in ((2, 20, 6, -14, 31), (6, 19, 16, -4, 30), (9, 16, 22, 2, 23), (4, 18, 3, 10, 32), (11, 14, 20, 12, 18), (1, 19, 10, 0, 34)):
        m.hull([(bx - 3, -8, bz), (bx + 4, -8, bz - 2), (bx + 3, 10, bz - 1), (bx - 2, 10, bz + 1), (bx, 0, bz + 3), (tx, ty, tz)], HAIR, M)
    m.hull([(0, -11, 17), (14, -9, 14), (15, 11, 12), (0, 12, 17), (1, -8, 22), (12, 0, 20)], HAIR, M)
    return m


def torso(M):
    """Chest and shoulders in the crooked split suit (HANZ's half neat slate, $@L's half rust-brown with a torn
    lapel), cream shirt V, a tie half and half, knotted crooked."""
    m = Mesh()
    pts = []
    for z, w, d in ((0, 23, 13), (22, 27, 15), (40, 30, 13), (46, 22, 10), (-20, 20, 11)):
        for x in (-w, -w * 0.4, 0, w * 0.4, w):
            pts += [(x, -d + abs(x) / w * 3, z), (x, d, z)]
    m.hull(pts, side(SUIT_H, SUIT_S), M)
    # lapels (HANZ's crisp, $@L's ragged and flipped up)
    m.slab([(-1, 36), (-14, 44), (-12, 14), (-3, 4)], -15.5, -13, SUIT_H2, M)
    m.slab([(1, 36), (15, 47), (19, 40), (12, 20), (14, 15), (4, 4)], -15.5, -13, SUIT_S2, M)
    # shirt V and collar points
    m.slab([(-8, 44), (8, 44), (0, 18)], -16.5, -15.5, SHIRT, M)
    m.slab([(-9, 45), (-1, 40), (-5, 35)], -17.5, -16.5, SHIRT_D, M)
    m.slab([(1, 40), (11, 47), (9, 36)], -17.5, -16.5, SHIRT_D, M)
    # tie: knot, then a blade that's half teal half red, swinging to $@L's side
    m.slab([(-2.5, 41), (2.5, 41), (2, 37), (-2, 37)], -18.5, -16.5, TIE_S, M)
    m.slab([(-2, 37), (0, 37), (1, 22), (-3, 24)], -18, -16.8, TIE_H, M)
    m.slab([(0, 37), (2, 37), (6, 23), (1, 22)], -18, -16.8, TIE_S, M)
    # a torn flap and a patch on $@L's half
    m.slab([(18, 6), (26, 10), (25, 0), (21, 3)], -14.5, -12, SUIT_S2, M)
    m.slab([(-22, 18), (-15, 18), (-15, 12), (-22, 12)], -15.2, -13.6, SUIT_H2, M)   # HANZ's pocket square pocket
    m.slab([(-21, 21), (-18, 25), (-16, 21)], -15.6, -14.8, SHIRT, M)
    # neck
    m.limb((0, 0, 44), (0, 1, 53), 6, 5.5, side(TEAL_D, RUST_D), sides=5, M=M)
    return m


def arm(M, s, shoulder, elbow, wrist, hand_dir):
    """One arm: an angular sleeve (shoulder pad, upper arm, forearm), a cuff, and a blocky hand with four fingers
    and a thumb. s = -1 HANZ's arm, +1 $@L's."""
    m = Mesh()
    suit, suit2 = (SUIT_H, SUIT_H2) if s < 0 else (SUIT_S, SUIT_S2)
    skin, skin_d = (TEAL, TEAL_D) if s < 0 else (RUST, RUST_D)
    m.hull([(shoulder[0] + dx * 7, shoulder[1] + dy * 8, shoulder[2] + dz * 6) for dx in (-1, 1) for dy in (-1, 1) for dz in (-1, 1)], suit2, M)
    m.limb(shoulder, elbow, 7.5, 6, suit, sides=4, twist=0.3, M=M)
    m.limb(elbow, wrist, 6, 5, suit, sides=4, twist=0.1, M=M)
    if s > 0:                                                                    # $@L's sleeve is torn short at the wrist
        e, w = np.array(elbow), np.array(wrist); t = e + (w - e) * 0.72
        m.limb(tuple(t), wrist, 4.6, 4.2, skin, sides=5, M=M)
    m.limb(tuple(np.array(wrist) - (np.array(wrist) - np.array(elbow)) * 0.08), wrist, 5.6, 5.6, SHIRT, sides=4, M=M)
    # the hand: a palm block pointing along hand_dir, fingers spread a little
    w = np.array(wrist, float); d = np.array(hand_dir, float); d /= np.linalg.norm(d)
    u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u)
    palm_end = w + d * 9
    m.hull([tuple(p + u * a + np.array((0, 0, z))) for p in (w, palm_end) for a in (-5.5, 5.5) for z in (-2.2, 2.2)], skin, M)
    for i, a in enumerate((-4.2, -1.4, 1.4, 4.2)):                              # fingers spread flat on the wood
        base = palm_end + u * a
        tip = base + d * (7 + (1.5 if i in (1, 2) else 0)) + u * a * 0.35 + np.array((0, 0, -1.2))
        m.limb(tuple(base), tuple(tip), 1.7, 1.4, skin, sides=4, M=M)
    m.limb(tuple(w + u * 5 * -s + d * 2), tuple(w + u * 10 * -s + d * 5 + np.array((0, 0, -1))), 2.0, 1.6, skin_d, sides=4, M=M)
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
    els[0].position = 0.0; els[0].color = (0.42, 0.42, 0.46, 1)
    els[1].position = 0.45; els[1].color = (0.72, 0.72, 0.74, 1)
    e3 = els.new(0.78); e3.color = (1.0, 1.0, 1.0, 1)
    remap = nt.nodes.new('ShaderNodeMapRange'); remap.inputs['From Min'].default_value = -1; L.new(dot.outputs['Value'], remap.inputs['Value'])
    L.new(remap.outputs['Result'], ramp.inputs['Fac'])
    # grain: fine noise, only where it's not fully lit
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexWhiteNoise'); nz.noise_dimensions = '3D'
    sc = nt.nodes.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.inputs['Scale'].default_value = 1.4
    L.new(tc.outputs['Object'], sc.inputs[0]); L.new(sc.outputs['Vector'], nz.inputs['Vector'])
    shadow = nt.nodes.new('ShaderNodeMath'); shadow.operation = 'LESS_THAN'; shadow.inputs[1].default_value = 0.85
    L.new(ramp.outputs['Color'], shadow.inputs[0])
    gr = nt.nodes.new('ShaderNodeMath'); gr.operation = 'MULTIPLY_ADD'; gr.inputs[1].default_value = -0.28; gr.inputs[2].default_value = 1.0
    gm = nt.nodes.new('ShaderNodeMath'); gm.operation = 'MULTIPLY'
    L.new(nz.outputs['Value'], gm.inputs[0]); L.new(shadow.outputs['Value'], gm.inputs[1])
    th = nt.nodes.new('ShaderNodeMath'); th.operation = 'GREATER_THAN'; th.inputs[1].default_value = 0.62
    L.new(gm.outputs['Value'], th.inputs[0]); L.new(th.outputs['Value'], gr.inputs[0])
    m1 = nt.nodes.new('ShaderNodeMix'); m1.data_type = 'RGBA'; m1.blend_type = 'MULTIPLY'; m1.inputs['Factor'].default_value = 1
    L.new(base, m1.inputs[6]); L.new(ramp.outputs['Color'], m1.inputs[7])
    m2 = nt.nodes.new('ShaderNodeVectorMath'); m2.operation = 'SCALE'
    L.new(m1.outputs[2], m2.inputs[0]); L.new(gr.outputs['Value'], m2.inputs['Scale'])
    em = nt.nodes.new('ShaderNodeEmission'); L.new(m2.outputs['Vector'], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return mt


def face_image():
    """Mason's face drawing over the split skin: left half teal, right half rust, his black lines on top."""
    src = np.array(Image.open(FACE).convert('RGBA'))
    H, W = src.shape[:2]
    img = np.zeros((H, W, 4), np.uint8); img[..., 3] = 255
    t = [TEAL >> 16 & 255, TEAL >> 8 & 255, TEAL & 255]; r = [RUST >> 16 & 255, RUST >> 8 & 255, RUST & 255]
    img[:, :W // 2, :3] = t; img[:, W // 2:, :3] = r
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
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 2.2
    vl = sc.view_layers[0]; fs = vl.freestyle_settings; fs.crease_angle = math.radians(150)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_crease = True; ls.select_border = True
    ls.select_contour = True; ls.select_external_contour = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = INK; ls.linestyle.thickness = 2.2
    flat = material(); facem = material(face_image())
    lean = pose == 'lean'
    body = T(0, 30, -15, rx=32 if lean else 4)                                   # hips behind the counter, chest tipped over it toward you
    neck_top = body @ Vector((0, 1, 52))
    head_M = T(*neck_top) @ T(0, -3, 13, rx=12 if lean else 0)                   # (head tipped a little down: looking at what's on the counter)
    to_object('torso', torso(body), [flat])
    hm = head(Matrix.Identity(4))                                                 # (built at rest so the face UVs are a straight front projection)
    ob = to_object('head', hm, [flat, facem], face_box=(-15.5, 15.5, -17, 15))
    ob.matrix_world = head_M
    for s in (-1, 1):
        sh = body @ Vector((s * 27, 0, 40))
        if lean:
            el = Vector((s * 40, 0, 14)); wr = Vector((s * 25, -11, 3)); hdir = (-s * 0.25, -1, 0)   # hands planted wide and flat, elbows out: leaning over the counter at you
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
    shot(cam, os.path.join(a.out, 'game.png'), 640, 360, (0, -165, 62), (0, 0, 24), 38)        # (how the LOST room frames him)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
