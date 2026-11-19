"""HANZ / $@L, THE TRUE SHOPKEEPER, as a real low-poly 3D model in Blender (`pip install bpy`, Blender 5.x).

The look: a few big flat angular planes (every part is the convex hull of a handful of points), thin black ink lines
on the silhouette and the sharp creases (Blender's Freestyle), bold flat colour per face lit in two hard steps, and
a speckled grain over everything (denser in the shadow).

Him: one lanky man split straight down the middle. HANZ (the LEFT of the picture) is tired, sad and smart: blood
RED. $@L (the right) is sneaky, quick to anger and foolish: pale GREY, with one curved devil horn. The split runs
through his face, his hands and the lining of his coat. His face is a big flat plate framed by black hair like a helmet, and on it is Mason's drawing
(tools/sprites/art/hanz_face.png, 64x64, black lines) as a pixel texture: HANZ's heavy drooping eye, $@L's beady eye
in spiral rings, a crooked grin across both. He wears a thick, heavy anime trench coat: a huge popped collar round
his head (lined red on HANZ's side, grey on $@L's), wide lapels, double-breasted buttons, a belt, epaulettes, wide
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
H_SKIN = 0xb8121c; H_SKIN_D = 0x860a12       # HANZ (left of the picture): blood red
S_SKIN = 0xd2d0cc; S_SKIN_D = 0xa8a6a2       # $@L (right of the picture): pale, drained of colour
HORN = 0x6e0810; HORN2 = 0x9a1018           # $@L's devil horn: dark blood red
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
FACE_X, FACE_Z = 18, (-23, 20)                    # the face plate: half its width, and its bottom / top
HEAD_SCALE = 0.8                                  # the head's size on his body
FACE_SPLIT = 31                                   # the drawing's column between his two eyes = where red turns grey
# the face texture's straight front projection (x0, x1, z0, z1 = where u / v run 0..1): column FACE_SPLIT lands on
# x = 0, the plate's edges on the drawing's edges, its top / bottom on rows 2 / 52 (so the whole grin fits on it)
FACE_UV = (-FACE_X, FACE_X * (64 - FACE_SPLIT) / FACE_SPLIT, FACE_Z[1] - 62 * (FACE_Z[1] - FACE_Z[0]) / 50, FACE_Z[1] + 2 * (FACE_Z[1] - FACE_Z[0]) / 50)


def head():
    """His head, as two meshes. 'face': a big flat face plate (Mason's drawing covers its whole front, red left, grey
    right) on a shallow head. 'hair': black hair framing it like a helmet - a cap, a heavy fringe in three big points
    over the brow, flat side panels down to the jaw ending in points, the back, a cowlick of two shards."""
    face, hair = Mesh(), Mesh()
    z0, z1 = FACE_Z
    front = [(-FACE_X, -11, z1), (FACE_X, -11, z1), (-FACE_X - 1.5, -11, 4), (FACE_X + 1.5, -11, 4),
             (-17, -11, -12), (17, -11, -12), (-9, -10, z0), (9, -10, z0)]
    back = [(x * 0.88, 9, z * 0.9) for x, _, z in front]
    face.hull(front + back, lambda c, n: (H_SKIN if c[0] < 0 else S_SKIN), uvface=lambda c, n: n[1] < -0.9)
    hair.hull([(-23, -14, 19), (23, -14, 19), (-23, 11, 18), (23, 11, 18), (-20, -13, 30), (20, -13, 30), (-19, 10, 29), (19, 10, 29)], HAIR)
    for (x0, x1, tipx, tipz) in ((-19, -6, -14, 12), (-7, 6, 1, 14), (5, 19, 13, 11)):
        hair.hull([(x0, -15, 21), (x1, -15, 21), (x0, -12, 21), (x1, -12, 21), (tipx, -14.5, tipz), (tipx, -12.5, tipz)], HAIR)
    for sx in (-1, 1):
        hair.hull([(sx * 19.5, -14, 22), (sx * 24.5, -14, 22), (sx * 19.5, 10, 22), (sx * 24.5, 10, 21),
                   (sx * 20, -13, -6), (sx * 23.5, -11, -8), (sx * 20, 7, -4), (sx * 21, -12.5, -15)], HAIR)
    hair.hull([(-20, 8, 26), (20, 8, 26), (-17, 11, -2), (17, 11, -2), (-17, 12, 18), (17, 12, 18)], HAIR)
    hair.hull([(2, -6, 29), (8, -4, 29), (5, 4, 29), (11, -9, 39)], HAIR)        # the cowlick
    hair.hull([(6, -3, 29), (11, -1, 29), (8, 6, 29), (16, -2, 35)], HAIR)
    # $@L's devil horn: rising out of the hair on his side, curving up and out to a point (segments taper)
    horn = Mesh()
    path = [(14, -2, 24), (19, -3, 31), (23, -4, 38), (25, -5, 45), (24, -6, 51)]
    rad = [4.2, 3.4, 2.5, 1.5, 0.2]
    for i in range(len(path) - 1):
        horn.limb(path[i], path[i + 1], rad[i], rad[i + 1], HORN if i % 2 == 0 else HORN2, sides=5, twist=0.3)
    return {'face': face, 'hair': hair, 'horn': horn}


def coat(M):
    """His chest and shoulders in the thick trench coat, as meshes: 'torso' (a narrow lanky body, wide lapels, two
    rows of brass buttons, a belt and buckle, epaulettes, the skirt flaring below the belt), 'collar_l' / 'collar_r'
    (the huge popped collar: two thick walls flaring out round his head, lined red on HANZ's side and grey on $@L's),
    'neck'."""
    torso, neck = Mesh(), Mesh()
    pts = []
    for z, w, d in ((-30, 19, 11), (0, 14, 8.5), (14, 13, 8.5), (32, 17, 9.5), (40, 22, 9.5), (45, 18, 8)):
        pts += [(x, y, z) for x in (-w, w) for y in (-d, d)]
    torso.hull(pts, lambda c, n: COAT2 if n[1] < -0.5 else COAT, M)
    torso.slab([(-3, 40), (-16, 39), (-11, 21), (2, 11)], -11.5, -9.6, COAT2, M)       # lapels, crossing for the double breast
    torso.slab([(3, 40), (16, 39), (11, 21), (-1, 11)], -12.6, -10.7, COAT2, M)
    torso.slab([(-4, 39.5), (4, 39.5), (2, 32), (-2, 32)], -10.9, -9.4, COAT3, M)        # the dark opening at the throat
    for bx in (-5.5, 5.5):
        for bz in (27, 20):
            torso.box((bx, -12.7, bz), (2.2, 1.0, 2.2), BRASS, M)
    torso.hull([(x, y, z) for x in (-15, 15) for y in (-10, 10) for z in (6, 11)], BELT, M)
    torso.box((0, -10.8, 8.5), (6, 1.4, 6), BRASS, M); torso.box((0, -11.2, 8.5), (3, 1.2, 3), BELT, M)
    for sx in (-1, 1):
        torso.slab([(sx * 10, 45.5), (sx * 22, 41.5), (sx * 22, 39.8), (sx * 10, 43.8)], -5, 5, COAT3, M)   # epaulettes
    neck.limb((0, 1, 40), (0, 1, 52), 5, 4.5, lambda c, n: H_SKIN_D if c[0] < 0 else S_SKIN_D, sides=4, M=M)
    out = {'torso': torso, 'neck': neck}
    for sx, nm in ((-1, 'collar_l'), (1, 'collar_r')):
        lining = H_SKIN_D if sx < 0 else S_SKIN_D
        col = Mesh()
        col.hull([(sx * 7, -8, 40), (sx * 7, 7, 42), (sx * 14, -7, 42), (sx * 14, 7, 42),
                  (sx * 22, -6, 62), (sx * 29, -9, 64), (sx * 28, 7, 63), (sx * 21, 6, 63)],
                 lambda c, n, sx=sx, lining=lining: lining if n[0] * sx < -0.3 else COAT, M)
        out[nm] = col
    return out


def arm(s, shoulder, elbow, wrist, hand_dir):
    """One long arm, as meshes: 'sleeve' (a sloped shoulder, a wide trench sleeve flaring at the cuff, a strap round
    the cuff) and 'hand' (a big long-fingered hand lying flat, red for HANZ (s = -1), grey for $@L (s = +1))."""
    sl, hd = Mesh(), Mesh()
    skin, skin_d = (H_SKIN, H_SKIN_D) if s < 0 else (S_SKIN, S_SKIN_D)
    x, y, z = shoulder
    sl.hull([(x - s * 4, y - 8, z + 4), (x - s * 4, y + 8, z + 4), (x + s * 8, y - 8, z - 3), (x + s * 8, y + 8, z - 3),
             (x - s * 4, y - 7, z - 6), (x - s * 4, y + 7, z - 6), (x + s * 7, y - 7, z - 9), (x + s * 7, y + 7, z - 9)], COAT)
    sl.limb(shoulder, elbow, 7, 6.5, COAT, sides=5, twist=0.4)
    e, w = np.array(elbow, float), np.array(wrist, float)
    cuff = e + (w - e) * 0.84
    sl.limb(elbow, tuple(cuff), 6.5, 8, COAT2, sides=5, twist=0.2)
    sl.limb(tuple(e + (w - e) * 0.68), tuple(e + (w - e) * 0.76), 8.0, 8.2, BELT, sides=5, twist=0.2)   # the cuff strap
    hd.limb(tuple(cuff), wrist, 3.4, 3.4, skin_d, sides=4)
    d = np.array(hand_dir, float); d /= np.linalg.norm(d)
    u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u)
    palm_end = w + d * 12
    hd.hull([tuple(p + u * a + np.array((0, 0, zz))) for p in (w, palm_end) for a in (-6, 6) for zz in (-1.8, 1.8)], skin)
    for i, a in enumerate((-4.6, -1.5, 1.5, 4.6)):                                   # long fingers lying flat on the wood
        base = palm_end + u * a
        tip = base + d * (12 + (2 if i in (1, 2) else 0)) + u * a * 0.3 + np.array((0, 0, -0.6))
        hd.limb(tuple(base), tuple(tip), 1.7, 1.4, skin, sides=4)
    hd.limb(tuple(w + u * 6 * -s + d * 2), tuple(w + u * 12 * -s + d * 7 + np.array((0, 0, -0.5))), 2.0, 1.6, skin_d, sides=4)
    return {'sleeve': sl, 'hand': hd}


def counter():
    """His shop counter, as meshes: 'counter' (a heavy wooden top, its lip, the body with raised boards), 'bell' (brass),
    'till' (an old till) and 'watch' (a pocket watch melting over the front edge - one of the dream's melting things)."""
    m = Mesh()
    m.box((0, 0, -2), (150, 44, 5), WOOD2)                                       # the top (its surface at z = 0.5)
    m.box((0, -20, -6), (154, 6, 4), WOOD)                                        # its front lip
    m.box((0, 0, -40), (144, 38, 70), WOOD3)                                      # the body
    for i in range(-2, 3):                                                         # raised boards on the front
        m.box((i * 27, -19.5, -40), (23, 1.5, 58), WOOD if i % 2 else WOOD2)
    bell = Mesh()
    bx, by = -64, 10
    bell.hull([(bx + 6 * math.cos(a), by + 6 * math.sin(a), 0.6) for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
              + [(bx + 3 * math.cos(a), by + 3 * math.sin(a), 6) for a in np.linspace(0, 2 * math.pi, 7)[:-1]], BRASS)
    bell.box((bx, by, 7.5), (1.6, 1.6, 3), BRASS2)
    till = Mesh()
    till.hull([(56, 0, 0.6), (74, 0, 0.6), (56, 20, 0.6), (74, 20, 0.6), (58, 7, 22), (72, 7, 22), (58, 20, 26), (72, 20, 26)], GREEN)
    for i in range(3):
        for j in range(3):
            till.box((60 + i * 5, 3 + j * 3, 6 + j * 4), (3.4, 2.5, 1.6), CLOCK)
    till.slab([(59, 26), (71, 26), (71, 32), (59, 32)], 15, 16.5, CLOCK)
    watch = Mesh()
    WX = -52
    rim = []
    for k in range(10):
        a = 2 * math.pi * k / 10
        x, y = 13 * math.cos(a), 9 * math.sin(a) - 12
        z = 1.2
        if y < -17: z = 1.2 - (abs(y) - 17) * 3; y = -23.6                       # (the part past the edge hangs down the lip)
        rim.append((x + WX, y, z))
    watch.hull(rim + [(p[0], p[1] - (0.8 if p[1] < -20 else 0), p[2] + 1.4) for p in rim], CLOCK)
    watch.hull([(WX - 6, -24.6, -6), (WX + 4, -24.6, -6), (WX - 2, -25.2, -20), (WX - 1, -24.4, -26), (WX, -25, -14)], CLOCK)   # the drip
    for k in range(12):                                                             # hour marks (the ones past the edge slide down with it)
        a = 2 * math.pi * k / 12; x, y = WX + 10 * math.cos(a), 7 * math.sin(a) - 12
        zz = 2.9
        if y < -17: zz = 2.9 - (abs(y) - 17) * 3; y = -25.2
        watch.box((x, y, zz), (1.4, 1.4, 0.6), INKC)
    watch.box((WX + 3, -12, 3.1), (7, 1, 0.6), INKC); watch.box((WX - 0.5, -9.5, 3.1), (1, 5, 0.6), INKC)   # its hands
    return {'counter': m, 'bell': bell, 'till': till, 'watch': watch}


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
    """Mason's face drawing over the split skin: HANZ's red left of FACE_SPLIT, $@L's grey right of it, his black lines on top."""
    src = np.array(Image.open(FACE).convert('RGBA'))
    H, W = src.shape[:2]
    img = np.zeros((H, W, 4), np.uint8); img[..., 3] = 255
    t = [H_SKIN >> 16 & 255, H_SKIN >> 8 & 255, H_SKIN & 255]; r = [S_SKIN >> 16 & 255, S_SKIN >> 8 & 255, S_SKIN & 255]
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
    body = T(0, 42, -4, rx=38 if lean else 4)                                   # hips behind the counter, hunched over it toward you
    neck_top = body @ Vector((0, 1, 50))
    head_M = T(*neck_top) @ T(0, -4, 15, rx=4 if lean else 0, ry=-7) @ Matrix.Scale(HEAD_SCALE, 4)   # (perfectly calm, head tilted a little - just slightly off)
    for nm, m in coat(body).items(): to_object(nm, m, [flat])
    for nm, m in head().items():                                                  # (built at rest, so the face UVs are a straight front projection)
        ob = to_object(nm, m, [flat, facem], face_box=FACE_UV if nm == 'face' else None); ob.matrix_world = head_M
    for s_ in (-1, 1):
        sh = body @ Vector((s_ * 24, 0, 41))
        if lean:
            el = Vector((s_ * 45, 2, 22)); wr = Vector((s_ * 28, -11, 2.9)); hdir = (-s_ * 0.18, -1, 0)   # hands flat and wide on the counter, elbows out
        else:
            el = body @ Vector((s_ * 31, 2, 14)); wr = Vector((s_ * 30, -8, 2.9)); hdir = (0, -1, 0)
        for nm, m in arm(s_, tuple(sh), tuple(el), tuple(wr), hdir).items():
            to_object(nm + ('_hanz' if s_ < 0 else '_sal'), m, [flat])
    for nm, m in counter().items(): to_object(nm, m, [flat])
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50; cam.data.clip_end = 5000
    return cam, head_M


# pairs of pieces that must never pass through each other (the shoulder joins and the hair on the head are meant to
# overlap, so they're not listed)
NO_CLIP = [('horn', 'collar_r'), ('horn', 'collar_l'), ('horn', 'face'), ('hair', 'collar_l'), ('hair', 'collar_r'), ('face', 'collar_l'), ('face', 'collar_r'), ('hair', 'torso'),
           ('face', 'torso'), ('face', 'neck_x'), ('sleeve_hanz', 'counter'), ('sleeve_sal', 'counter'),
           ('hand_hanz', 'counter'), ('hand_sal', 'counter'), ('hand_hanz', 'watch'), ('hand_hanz', 'bell'),
           ('hand_sal', 'till'), ('sleeve_sal', 'till'), ('sleeve_hanz', 'collar_l'), ('sleeve_sal', 'collar_r'),
           ('sleeve_hanz', 'hair'), ('sleeve_sal', 'hair'), ('torso', 'counter'), ('collar_l', 'collar_r'),
           ('hand_hanz', 'sleeve_sal'), ('sleeve_hanz', 'sleeve_sal')]


def clip_check():
    """Lists every NO_CLIP pair whose meshes pass through each other (Blender BVH overlap). Returns the bad pairs."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get(); trees = {}
    def tree(n):
        if n not in trees:
            ob = bpy.data.objects.get(n)
            if not ob: return None
            me = ob.evaluated_get(dg).to_mesh(); mw = ob.matrix_world
            trees[n] = BVHTree.FromPolygons([mw @ v.co for v in me.vertices], [list(p.vertices) for p in me.polygons])
        return trees[n]
    bad = []
    for a_, b_ in NO_CLIP:
        ta, tb = tree(a_), tree(b_)
        if ta and tb and ta.overlap(tb): bad.append((a_, b_, len(ta.overlap(tb))))
    return bad


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
    print('CLIPPING:', clip_check() or 'none')
    face = hm @ Vector((0, 0, 0))
    shot(cam, os.path.join(a.out, 'front.png'), 480, 480, (0, -240, 70), (0, 0, 22), 50)
    shot(cam, os.path.join(a.out, 'close.png'), 400, 400, (0, -120, face.z + 8), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'hanz.png'), 400, 400, (-95, -95, face.z + 10), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'sal.png'), 400, 400, (95, -95, face.z + 10), tuple(face), 60)
    shot(cam, os.path.join(a.out, 'wide.png'), 640, 360, (-120, -300, 120), (0, 0, 20), 45)
    shot(cam, os.path.join(a.out, 'game.png'), 640, 360, (0, -215, 78), (0, 0, 36), 36)        # (how the LOST room frames him)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
