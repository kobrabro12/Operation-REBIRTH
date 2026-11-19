"""The LOST room behind HANZ / $@L: a surreal dream, rendered PS1-style in Blender like him (light baked into the
vertices - hanz_3d.light_up - distance fog toward the dusk, wobbly snapped vertices, 320x180 with the PS1's 15-bit
dithered colour, saved at 2x) through the same camera as his animations (hanz_anim.CAM), as three layers the game
drifts separately:

  sky    a smooth dusk sky (peach -> lilac -> violet) with soft lit clouds and his split moon glowing
  room   a checkerboard floor that runs off into the sky and breaks into floating tiles; two walls and no back wall;
         on the left wall a tall doorway with a staircase climbing into it (and the same stairs hanging upside down
         from nowhere on the right - impossible rooms); on the right wall a window that shows THIS room (rendered once,
         then laid into the window); a big clock melting off a shelf and a sagging price-tag shelf (melting things);
         striped walls that lean in at the top; floor tiles dripping off the far edge; lamps on cords into the sky;
         a moon split grey / red like him
  float  things drifting in the open sky: a door standing on nothing, loose floor tiles

Run:  python3 tools/sprites/hanz_room.py [--preview FILE]
      -> public/assets/shop/lost/room_sky.png, room.png, room_float.png (640x360 each) and room_dark.png (the room with
         the lights out, before you know his name)
"""
import os, sys, math, argparse
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import hanz_3d as H
import hanz_anim as A
import bpy
from mathutils import Vector

OUT = A.OUT
FLOOR = -75                                     # the floor's height (the counter stands on it)
# colours: a dusk dream
SKY = [0xf4c29a, 0xeeb09a, 0xd8a0b0, 0xb890c0, 0x8a78b8, 0x5c5a98, 0x3a3c74]
CLOUD = 0xf8e4d0; CLOUD2 = 0xe0c0c8
WALL = 0xc89a64; WALL2 = 0xb08050; TRIM = 0x6a3c28
TILE_A = 0x18161c; TILE_B = 0xe8dcc4
DOOR = 0x2a1a24; DOORF = 0x8a5030; STAIR = 0xd8c8b0; STAIR2 = 0xa89880
LAMP = 0xffe8a8; CORD = 0x1a1a1a
LAMPS = ((-150, 300, 95), (150, 260, 88), (-40, 560, 125), (70, 420, 110))   # the lamps hanging on cords
SHELF = 0x6a4028; TAG = 0xf0e8d8; GLASS = 0x9ab8c8


def sky_plane():
    """The sky itself: one big sheet far behind everything, its colour running smoothly down through SKY (an unlit
    glow - it's the light, not lit by it)."""
    top, bot = 240, -860                          # (what the room's camera sees at the sky's distance)
    rows = 40; vs, fs, cols = [], [], []
    for i in range(rows + 1):
        z = top - (top - bot) * i / rows; vs += [(-2000, 1600, z), (2000, 1600, z)]
        t = i / rows * (len(SKY) - 1); a, f = int(t), t - int(t); b = min(a + 1, len(SKY) - 1)
        c = [((SKY[a] >> sh & 255) * (1 - f) + (SKY[b] >> sh & 255) * f) / 255 for sh in (16, 8, 0)]
        cols.append(tuple(v ** 2.2 for v in c))
    for i in range(rows): fs.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    me = bpy.data.meshes.new('sky'); me.from_pydata(vs, [], fs); me.update()
    at = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for k in range(len(vs)): at.data[k].color = cols[k // 2] + (1,)
    me.materials.append(glow_material('skyglow', strength=1.0))
    ob = bpy.data.objects.new('sky', me); bpy.context.scene.collection.objects.link(ob); ob['room'] = 1
    return ob


def glow_material(name, colour=None, strength=1.0):
    """An unlit glowing material: a fixed colour, or the mesh's own colours ('Col') if colour is None."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength
    if colour is None:
        ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'; nt.links.new(ca.outputs['Color'], em.inputs['Color'])
    else: em.inputs['Color'].default_value = colour + (1,)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def sky():
    """Soft lit clouds drifting in front of the sky, and his moon."""
    m = H.Mesh()
    rng = np.random.default_rng(7)
    for i in range(9):
        cx, cz = rng.uniform(-700, 700), rng.uniform(-260, 200); w = rng.uniform(120, 260)
        pts = [(cx + w * math.cos(a) * rng.uniform(0.7, 1), 1500 - rng.uniform(0, 40), cz + w * 0.18 * math.sin(a) * rng.uniform(0.6, 1)) for a in np.linspace(0, 2 * math.pi, 10)[:-1]]
        m.hull(pts + [(x, y - 30, z) for x, y, z in pts] + [(cx, 1470, cz + w * 0.1)], CLOUD if i % 2 else CLOUD2)
    # his moon: a big disc split down the middle, grey on HANZ's side, red on $@L's
    mo = H.Mesh()
    for side, col in ((-1, 0xb8121c), (1, 0xd2d0cc)):
        pts = [(300 + side * 110 * math.sin(a), 1450, 40 + 110 * math.cos(a)) for a in np.linspace(0, math.pi, 9)] + [(300, 1450, -70), (300, 1450, 150)]
        mo.hull(pts + [(x, y - 4, z) for x, y, z in pts], col)
    return {'clouds': m, 'moon': mo}


def room():
    """The room: floor, leaning striped walls, the doorway + stairs and their upside-down twin, the window that shows
    this room, a big melting clock, a sagging price-tag shelf, lamps on cords into the sky."""
    parts = {}
    fl = H.Mesh()
    T = 40
    for i in range(-12, 13):
        for j in range(-4, 22):
            x, y = i * T, j * T
            if j > 16 and (i * 7 + j * 3) % 5 < 2: continue                        # (the far floor breaks up into the sky)
            drop = max(0, j - 15) ** 1.6 * 6                                         # ... and sags away as it goes
            c = TILE_A if (i + j) % 2 else TILE_B
            fl.box((x, y, FLOOR - 2 - drop), (T, T, 4), c)
            if j >= 15 and (i * 5 + j) % 3 == 0:                                     # the edge tiles drip, stretched down
                fl.hull([(x - 6, y - 4, FLOOR - 4 - drop), (x + 6, y - 4, FLOOR - 4 - drop), (x, y + 4, FLOOR - 4 - drop),
                         (x - 2, y, FLOOR - 40 - drop - (i % 4) * 14), (x + 2, y, FLOOR - 40 - drop - (i % 4) * 14)], c)
    parts['floor'] = fl
    w = H.Mesh()
    for sx in (-1, 1):
        # the walls lean in toward the top (wrong), in stripes of wallpaper
        for k in range(16):
            y0, y1 = -100 + k * 50, -100 + (k + 1) * 50
            w.hull([(sx * 262, y0, FLOOR), (sx * 262, y1, FLOOR), (sx * 268, y0, FLOOR), (sx * 268, y1, FLOOR),
                    (sx * 222, y0, 360), (sx * 222, y1, 360), (sx * 228, y0, 360), (sx * 228, y1, 360)], WALL if k % 2 else WALL2)
        w.hull([(sx * 258, -100, FLOOR), (sx * 258, 700, FLOOR), (sx * 262, -100, FLOOR), (sx * 262, 700, FLOOR),
                (sx * 258, -100, FLOOR + 14), (sx * 258, 700, FLOOR + 14), (sx * 262, -100, FLOOR + 14), (sx * 262, 700, FLOOR + 14)], TRIM)
    parts['walls'] = w
    # the left wall's doorway (black inside) with a staircase climbing into it, far back
    d = H.Mesh()
    d.box((-246, 380, 40), (4, 90, 230), DOOR)
    for k in (-1, 1): d.box((-244, 380 + k * 48, 40), (8, 8, 238), DOORF)
    d.box((-244, 380, 158), (8, 104, 8), DOORF)
    st = H.Mesh()
    for k in range(10):
        x, y, z = -200 - k * 4, 300 + k * 8, FLOOR + 6 + k * 13
        st.box((x, y, z), (44, 22, 12), STAIR2)                                       # riser
        st.box((x, y + 4, z + 6.5), (44, 26, 1.5), STAIR)                            # tread
    # its twin hanging upside down from the sky, climbing the wrong way
    for k in range(10):
        x, y, z = 130 - k * 6, 560 + k * 10, 150 - k * 13
        st.box((x, y, z), (44, 22, 12), STAIR2); st.box((x, y + 4, z - 6.5), (44, 26, 1.5), STAIR)
    parts['door'] = d; parts['stairs'] = st
    # the window on the right wall, nearer and bigger (its pane shows this room: second pass)
    win = H.Mesh()
    WY, WZ, HW, HH = 360, 10, 50, 62
    for k in (-1, 1):
        win.box((252, WY + k * HW, WZ), (8, 8, HH * 2 + 8), DOORF)
        win.box((252, WY, WZ + k * HH), (8, HW * 2 + 8, 8), DOORF)
    win.box((252, WY, WZ), (4, 2, HH * 2), DOORF)
    parts['window'] = win
    pane = H.Mesh()
    pane.hull([(x, y, z) for x in (249, 250) for y in (WY - HW, WY + HW) for z in (WZ - HH, WZ + HH)], GLASS)
    parts['pane'] = pane
    # a big clock melting off a shelf on the left wall, near the front
    cl = H.Mesh()
    CY, CZ, R = 350, 40, 34
    WX = -246                                         # (the wall's face at that height)
    cl.box((WX + 14, CY, CZ - R - 4), (30, 90, 6), SHELF)
    rim, face = [], []
    for k in range(16):
        a = 2 * math.pi * k / 16
        y, z = CY + R * math.cos(a), CZ + R * math.sin(a)
        x = WX + 6
        if z < CZ - R * 0.4:                                                          # the bottom slumps over the shelf edge
            sag = (CZ - R * 0.4 - z); x = WX + 6 + sag * 0.9; z = CZ - R - 2 - sag * 0.15
        rim.append((x, y, z))
    cl.hull(rim + [(x + 4, y, z) for x, y, z in rim], TAG)
    cl.hull([(WX + 32, CY - 14, CZ - R - 1), (WX + 32, CY + 10, CZ - R - 1), (WX + 38, CY - 4, CZ - R - 50), (WX + 36, CY + 2, CZ - R - 70), (WX + 39, CY - 2, CZ - R - 30)], TAG)   # the long drip
    for k in range(12):
        a = 2 * math.pi * k / 12
        cl.box((WX + 11, CY + 27 * math.cos(a), CZ + 27 * math.sin(a)), (1, 4, 4), H.INKC)
    cl.box((WX + 11, CY + 10, CZ + 2), (1, 22, 3), H.INKC); cl.box((WX + 11, CY - 1, CZ + 12), (1, 3, 22), H.INKC)
    parts['clock'] = cl
    # a sagging shelf of price tags on the right wall, near the front
    sh = H.Mesh()
    for k in range(7):
        y = 470 + k * 18; sag = math.sin(k / 6 * math.pi) * 16
        sh.box((236, y, -10 - sag), (30, 18, 4), SHELF)
        drip = 16 + k % 3 * 6
        sh.hull([(230, y - 5, -16 - sag), (230, y + 5, -16 - sag), (230, y + 4, -16 - sag - drip), (230, y - 4, -16 - sag - drip * 0.7),
                 (232, y - 5, -16 - sag), (232, y + 5, -16 - sag), (232, y + 4, -16 - sag - drip), (232, y - 4, -16 - sag - drip * 0.7)], TAG)
    parts['shelf'] = sh
    # lamps on cords running up into the sky
    lp = H.Mesh()
    for (x, y, z) in LAMPS:
        lp.box((x, y, z + 300), (1.2, 1.2, 600), CORD)
        lp.hull([(x + 14 * math.cos(a), y + 14 * math.sin(a), z - 12) for a in np.linspace(0, 2 * math.pi, 7)[:-1]]
                + [(x + 4 * math.cos(a), y + 4 * math.sin(a), z + 2) for a in np.linspace(0, 2 * math.pi, 5)[:-1]], LAMP)
    parts['lamps'] = lp
    return parts


def floaters():
    """Things drifting in the open sky behind the room: a door standing on nothing, loose floor tiles."""
    f = H.Mesh()
    f.box((-110, 900, 30), (70, 6, 150), DOOR); f.box((-110, 897, 30), (78, 4, 158), DOORF)
    f.box((-86, 896, 20), (6, 2, 6), 0xd8b040)
    rng = np.random.default_rng(3)
    for i in range(12):
        x, y, z = rng.uniform(-420, 420), rng.uniform(750, 1300), rng.uniform(-200, 120)
        a = rng.uniform(0, 1)
        f.hull([(x + dx, y + dy, z + dz * (1 + a)) for dx in (-18, 18) for dy in (-18, 18) for dz in (-2, 2)], TILE_A if i % 2 else TILE_B)
    return {'float': f}


def emit_lamps():
    """The lamps glow: their faces are full brightness whatever the light."""
    ob = bpy.data.objects.get('lamps')
    if not ob: return
    m = bpy.data.materials.new('glow'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1, 0.85, 0.5, 1); em.inputs['Strength'].default_value = 1.15
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(m)
    for p in ob.data.polygons: p.material_index = 0
    mo = bpy.data.objects.get('moon')                                             # the moon glows (red / grey, from its own colours)
    if mo:
        mo.data.materials.clear(); mo.data.materials.append(glow_material('moonglow', strength=1.0))
        for p in mo.data.polygons: p.material_index = 0


def pane_material(img_path):
    """The window pane shows a picture of the room (img_path), laid flat on the glass, a little washed out."""
    m = bpy.data.materials.new('pane'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(img_path); tex.interpolation = 'Cubic'
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UV'; L.new(uv.outputs['UV'], tex.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['Factor'].default_value = 0.18
    L.new(tex.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (0.75, 0.85, 0.95, 1)
    em = nt.nodes.new('ShaderNodeEmission'); L.new(mix.outputs[2], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return m


# what the room's colours are made of (added to hanz_3d's KINDS / LOOK): a glossy lacquered checker floor that
# reflects, matte wallpaper, soft clouds, painted wood
H.KINDS.update({'tile': (TILE_A, TILE_B), 'paper_wall': (WALL, WALL2, TAG), 'cloud': (CLOUD, CLOUD2), 'stairs': (STAIR, STAIR2)})
H.LOOK.update({'tile': (0.35, 0, 1)})
H.SMOOTH.update({'clouds': 80})


def make(objs, mats):
    """Turns the meshes into objects (tagged 'room'); mats = the materials (the room's kinds are added to it)."""
    for nm, m in objs.items():
        ob = H.to_object(nm, m, mats, face_box=None); ob['room'] = 1
        bpy.context.view_layer.update(); H.light_up(ob, bpy.data.objects['cam'], snap=True)


def shoot(path, show, holdout=()):
    """Renders the objects named in show (others hidden; holdout ones cut a hole)."""
    for ob in bpy.data.objects:
        if ob.type not in ('MESH', 'META'): continue
        ob.hide_render = ob.name not in show and ob.name not in holdout
        ob.is_holdout = ob.name in holdout
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = H.ps1_post(np.array(Image.open(path).convert('RGBA')))
    return np.array(Image.fromarray(im).resize((im.shape[1] * A.SCALE, im.shape[0] * A.SCALE), Image.NEAREST))   # (saved at the game's size)


def save(arr, name, opaque=False):
    """Saved into OUT as a palette PNG (soft edges kept - libimagequant), opaque = no see-through at all."""
    a = arr.copy()
    if opaque: a[..., 3] = 255
    else: a[a[..., 3] <= 4] = 0
    A.quantize(a, 256).save(os.path.join(OUT, name), optimize=True)
    return a


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--preview', default=''); a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    cam, mats = A.setup()
    sc = bpy.context.scene; sc.render.use_border = False
    for ob in list(bpy.data.objects):                                            # (the desk isn't part of the room)
        if ob.name in A.DESK: ob.hide_render = True
    sky_plane(); make(sky(), mats); make(room(), mats); make(floaters(), mats); emit_lamps()
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'room_pass.png')
    room_names = ['floor', 'walls', 'door', 'stairs', 'window', 'pane', 'clock', 'shelf', 'lamps']
    sky_names = ['sky', 'clouds', 'moon']
    # pass 1: the whole scene, so the window can show it
    first = shoot(tmp, sky_names + room_names + ['float'])
    Image.fromarray(first).save(os.path.join(bpy.app.tempdir or '/tmp', 'room_first.png'))
    pane = bpy.data.objects['pane']
    me = pane.data; uvl = me.uv_layers.get('UV') or me.uv_layers.new(name='UV')
    for poly in me.polygons:                                                      # (the picture laid across the pane)
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = ((v.y - 310) / 100, (v.z + 52) / 124)
    pane.data.materials.clear(); pane.data.materials.append(pane_material(os.path.join(bpy.app.tempdir or '/tmp', 'room_first.png')))
    for p in pane.data.polygons: p.material_index = 0
    for ob in pane.modifiers: pane.modifiers.remove(ob)
    skyl = shoot(tmp, sky_names)
    rooml = shoot(tmp, room_names)
    floatl = shoot(tmp, ['float'], holdout=room_names)
    save(skyl, 'room_sky.png', opaque=True)
    save(rooml, 'room.png')
    save(floatl, 'room_float.png')
    # the room with the lights out: everything near-black, just a faint shape
    full = skyl.astype(float)
    for lay in (floatl, rooml):
        al = lay[..., 3:4] / 255; full[..., :3] = full[..., :3] * (1 - al) + lay[..., :3] * al
    dark = (full[..., :3] * np.array([0.08, 0.07, 0.11])).clip(0, 255)
    dk = np.zeros((360, 640, 4), np.uint8); dk[..., :3] = dark; dk[..., 3] = 255
    save(dk, 'room_dark.png', opaque=True)
    if a.preview:
        comp = Image.fromarray(skyl).convert('RGBA'); comp.alpha_composite(Image.fromarray(floatl)); comp.alpha_composite(Image.fromarray(rooml))
        comp.resize((1280, 720), Image.NEAREST).save(a.preview)


if __name__ == '__main__':
    main()
