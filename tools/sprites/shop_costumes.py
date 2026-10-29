"""The shop costumes (Trinkets > SHOP): each one is its own drawing, not just a recolour - new parts (crowns,
halos, collars, horns, visors, shades...), reshaped capes and robes, new weapons - on top of the costume's colours.

  python3 tools/sprites/shop_costumes.py [eclipse aurora celestial vampire sakura plague obsidian cyber verdant vapor glam
                                           sunset midnight] [--preview DIR]

How each fighter is done:
  Soul Summoner, Mr Wake  their puppets (ss_rig.py / mw_rig.py, cut from Mason's idle drawing) get the costume's
                          colours and new parts, then play every move (soul_summoner_moves.py / mr_wake_moves.py).
                          Mason's hand-made idle and run strips get the same changes grafted on, frame by frame
                          (costume_kit.graft finds each body part in the frame).
  Lacy                    her hand-drawn strips are repainted pixel by pixel, placed from the top of her scarf
                          (as hero_knight_samurai.py does); then hero_knight_moves.py builds her moves sheet.
  NU, AERO                their part drawings (nu_draw.py / aero_draw.py) get the colours and new parts, then
                          every animation is rebuilt (nu_moves.py build_all).
Output: public/assets/fighters/<fighter>/<costume>/<strip>_sheet.png - the same layout as the normal sheets, so the
game's frame indexes work for both. In the game each costume is a skin with `sheetSet` (src/fighters/skins.js).
"""
import os, sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import costume_kit as K

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
FIG = os.path.join(ROOT, 'public/assets/fighters')
PREVIEW = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None

def rad(cx, cy):
    yy, xx = np.mgrid[0:64, 0:64]
    return np.hypot(xx - cx, yy - cy), np.degrees(np.arctan2(yy - cy, xx - cx))

def blank(): return np.zeros((64, 64, 4), np.uint8)

# ====================================================================== SOUL SUMMONER
SSG = {'eyes': {'h': (318, 332), 'center': 324}, 'flame': {'h': (200, 215), 's': (0.3, 1), 'center': 207},
       'gold': {'h': (20, 46), 's': (0.45, 1), 'center': 37}, 'cape': {'h': (262, 298), 'center': 280},
       'armor': {'h': (0, 40), 's': (0, 0.3), 'v': (0.15, 1), 'center': 25}}

def cape_bottoms(lay):
    """for each column, the lowest pixel of the layer"""
    out = {}
    ys, xs = np.nonzero(lay[..., 3] > 0)
    for x, y in zip(xs, ys): out[x] = max(out.get(x, 0), y)
    return out

def ss_eclipse(N, L):
    G = [0x4a2c06, 0x8a5a12, 0xd0a030, 0xffdc80, 0xfff6d8]
    pal = {str(i): G[i] for i in range(5)}
    # a taller sunburst crown with a white-gold gem
    K.stamp(N['head'], 27, 0, ["......4......",
                               "..4...3...4..",
                               "..3..343..3..",
                               "4.2..232..2.4",
                               "3.21.121.12.3"], pal)
    # the cape: a torn hem, trimmed in gold
    cape = N['cape']
    for x, y in cape_bottoms(cape).items():
        if y < 44: continue
        cut = [0, 3, 1, 4, 2, 0, 2][x % 7]
        for d in range(cut): cape[y - d] [x] = 0
        yb = y - cut
        if cape[yb, x, 3]: K.put(cape, x, yb, G[2]); K.put(cape, x, yb - 1, G[1]) if cape[yb - 1, x, 3] else None
    # the eclipse: a black sun with a burning ring and corona behind his head
    cor = blank(); r, a = rad(33, 11)
    cor[(r > 8.4) & (r <= 9.4)] = (*K.hexrgb(G[1]), 255)
    cor[(r > 9.4) & (r <= 10.4)] = (*K.hexrgb(G[3]), 255)
    rays = (r > 11.2) & (r <= 14.5) & (((a + 375) % 30) < 7) & ((a > -40) & (a < 220))
    cor[rays] = (*K.hexrgb(G[2]), 255)
    cor[rays & (r > 13.2)] = (*K.hexrgb(G[4]), 255)
    return [('corona', cor, 'head', (34, 17), -1)], {'corona'}, None

def ss_aurora(N, L):
    ICE = {'o': 0x0c3a4a, '1': 0x1a9ab8, '2': 0x5ae0f8, '3': 0xbaffff, '4': 0xffffff}
    # a crown of ice shards
    K.stamp(N['head'], 27, 0, ["......o......",
                               "..o..o4o..o..",
                               ".o3o.o3o.o3o.",
                               "o3o2o232o2o3o",
                               "o2o1o121o1o2o"], ICE)
    # the cape: ribbons of green and magenta light rippling down it, and stars
    for n in N: aurora_paint(N[n], mask=ss_cape_mask(L[n]))      # (the cape's purple runs into the robe layers too)
    # ice on his front pauldron
    K.stamp(N['fupper'], 36, 19, ["..o..", ".o4o.", "o232o"], ICE, only_empty=True)
    return [], set(), lambda orig, out: aurora_paint(out, mask=ss_cape_mask(orig))

def ss_cape_mask(frame):
    """pixels of his cape (by its colours) in one of Mason's frames"""
    f = K.color_fn(SSG, {})
    m = np.zeros(frame.shape[:2], bool)
    ys, xs = np.nonzero(frame[..., 3] > 0)
    for x, y in zip(xs, ys):
        h, s_, v = K._rgb2hsv(*(int(c) for c in frame[y, x, :3]))
        if 262 <= h <= 298: m[y, x] = True
    return m

def aurora_paint(cape, mask=None):
    ys, xs = np.nonzero(mask if mask is not None else cape[..., 3] > 0)
    for x, y in zip(xs, ys):
        v = K.shade_of(cape[y, x])
        band = math.sin(x * 0.55 + y * 0.22)
        if band > 0.3: cape[y, x, :3] = K.hexrgb(K.ramp_pick([0x5a1a6a, 0xa02aa0, 0xe050c8, 0xff9ae8], v, 0.0, 0.42))
        elif band < -0.3: cape[y, x, :3] = K.hexrgb(K.ramp_pick([0x14604a, 0x22a070, 0x4ae890, 0xb8ffd8], v, 0.0, 0.42))
        else: cape[y, x, :3] = K.hexrgb(K.ramp_pick([0x0c3a5a, 0x16608a, 0x2a90c0, 0x6ad0f0], v, 0.0, 0.42))
        if (x * 13 + y * 7) % 41 == 0: cape[y, x, :3] = (255, 255, 255)

def ss_celestial(N, L):
    MOON = {'o': 0x1a2040, '1': 0x8a9ac8, '2': 0xc8d4f0, '3': 0xf4f8ff, 'c': 0x7ae8ff}
    # a silver crown with a star-shaped gem
    K.stamp(N['head'], 27, 0, ["......c......",
                               "..2..ccc..2..",
                               "..3...c...3..",
                               "2.21.121.12.2",
                               "3.21.121.12.3"], MOON)
    # a crescent moon rising behind his head
    m = blank(); r, _ = rad(33, 9); r2, _ = rad(37, 6)
    cres = (r <= 10.5) & (r2 > 9)
    m[cres] = (*K.hexrgb(MOON['2']), 255); m[cres & (r <= 9.5) & (r2 > 10.2)] = (*K.hexrgb(MOON['3']), 255)
    outline(m, MOON['o'])
    # the cape becomes the night sky
    for n in N: starfield_paint(N[n], mask=ss_cape_mask(L[n]))
    return [('moon', m, 'head', (34, 17), -1)], {'moon'}, lambda orig, out: starfield_paint(out, mask=ss_cape_mask(orig))

def starfield_paint(cape, mask=None):
    """the night sky: deep blue, a violet nebula drifting across, stars (some with a cross-shaped glint)"""
    ys, xs = np.nonzero(mask if mask is not None else cape[..., 3] > 0)
    for x, y in zip(xs, ys):
        v = K.shade_of(cape[y, x])
        neb = math.sin(x * 0.35 - y * 0.28)
        ramp = [0x2a1060, 0x4a1a8a, 0x7a3ab8, 0xb07ae0] if neb > 0.55 else [0x06081c, 0x0c1438, 0x162458, 0x24387a]
        cape[y, x, :3] = K.hexrgb(K.ramp_pick(ramp, v, 0.0, 0.42))
        k = (x * 31 + y * 17) % 53
        if k == 0: cape[y, x, :3] = (255, 255, 255)
        elif k in (7, 29): cape[y, x, :3] = (170, 200, 255)

SS_LOOKS = {
    'eclipse': (ss_eclipse, {'armor': {'sat': 0.2, 'val': 0.32}, 'cape': {'sat': 0.15, 'val': 0.35}, 'gold': {'to': 44, 'sat': 1.1, 'val': 1.25}, 'flame': {'to': 46, 'sat': 0.35, 'val': 1.35}, 'eyes': {'to': 48, 'sat': 0.3, 'val': 1.3}}, (255, 220, 128)),
    'celestial': (ss_celestial, {'armor': {'to': 222, 'sat': 0.25, 'val': 1.35}, 'gold': {'to': 210, 'sat': 0.35, 'val': 1.3}, 'flame': {'to': 196, 'sat': 0.55, 'val': 1.3}, 'eyes': {'to': 188, 'sat': 0.9, 'val': 1.3}, 'cape': {'to': 230, 'sat': 0.8, 'val': 0.5}}, (180, 210, 255)),
    'aurora': (ss_aurora, {'cape': {'to': 172, 'sat': 1.4, 'val': 0.9}, 'flame': {'to': 312, 'sat': 1.1, 'val': 1.15}, 'gold': {'sat': 0.12, 'val': 1.2}, 'eyes': {'to': 160, 'val': 1.2}, 'armor': {'to': 200, 'satAdd': 0.12, 'val': 0.8}}, (90, 224, 248)),
}

def build_ss(name):
    import ss_rig, soul_summoner_moves as SSM
    edit, rules, ghost = SS_LOOKS[name]
    src = os.path.join(FIG, 'soul-summoner')
    sheet = np.array(Image.open(os.path.join(src, 'idle_sheet.png')).convert('RGBA'))
    base, L, flames = ss_rig.layers_from(sheet)
    fn = K.color_fn(SSG, rules); rc = lambda a: K.recolor(a, SSG, rules, fn)
    N = {n: rc(L[n]) for n in L}; NF = [rc(f) for f in flames]
    extras, behind, paint = edit(N, L)
    small, big = K.rig_from(N, ss_rig.ORDER, ss_rig.PARENT, ss_rig.FEET, (112, 104), (24, 36), follow=SSM.FOLLOW,
                            variants={'flame': NF}, upright={'flame': 0.75, 'cape': 0.55}, extras=extras)
    out = os.path.join(src, name); os.makedirs(out, exist_ok=True)
    SSM.SMALL, SSM.BIG, SSM.DIR, SSM.JS, SSM.GHOST = small, big, out, os.devnull, ghost
    moves = SSM.build()
    for strip in ('idle', 'run', 'juggle'):
        frames = K.strip_frames(Image.open(os.path.join(src, strip + '_sheet.png')), 64, 64)
        res = [K.graft(f, L, N, rc, extras, parts=[p for p in ss_rig.ORDER if p != 'flame'], search=4 if strip == 'idle' else 7, behind=behind, paint=paint) for f in frames]
        K.save_strip(res, os.path.join(out, strip + '_sheet.png'), 64, 64)
    return moves


# ====================================================================== MR WAKE
MWG = {'robe': {'h': (325, 350), 's': (0.4, 1), 'center': 334}, 'magic': {'h': (255, 285), 's': (0.25, 1), 'v': (0.4, 1), 'center': 268},
       'cloth': {'h': (255, 300), 's': (0.15, 0.6), 'v': (0.15, 0.4), 'center': 268}, 'wood': {'h': (15, 40), 's': (0.4, 1), 'center': 27},
       'staff': {'s': (0, 0.12), 'v': (0.12, 0.4), 'center': 0}}

def poly(lay, pts, col):
    from PIL import ImageDraw
    im = Image.fromarray(lay, 'RGBA'); ImageDraw.Draw(im).polygon(pts, fill=(*K.hexrgb(col), 255))
    lay[:] = np.array(im)

def outline(lay, col, only=None):
    """a 1 px outline round everything in the layer (or round the mask `only`)"""
    m = lay[..., 3] > 0 if only is None else only
    o = np.zeros_like(m)
    o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    o &= ~m & (lay[..., 3] == 0)
    lay[o] = (*K.hexrgb(col), 255)

def scallop(lay, depth, edge, period=5, below=40):
    """cuts the bottom edge of a layer into scallops (a bat wing's hem), edged in `edge`"""
    for x, y in cape_bottoms(lay).items():
        if y < below: continue
        cut = round(depth * abs(math.sin(x * math.pi / period)))
        for d in range(cut): lay[y - d, x] = 0
        if lay[y - cut, x, 3]: K.put(lay, x, y - cut, edge)

def mw_vampire(N, L):
    R = [0x2a0408, 0x6a0a14, 0xb01a28, 0xe8384a]
    # a tall, flared collar behind his head: black outside, blood-red lining
    col = blank()
    poly(col, [(24, 12), (33, 18), (37, 23), (41, 23), (45, 18), (54, 13), (50, 21), (44, 26), (34, 26), (28, 21)], 0x120a12)
    poly(col, [(26, 14), (34, 19), (37, 22), (41, 22), (45, 19), (52, 15), (48, 21), (43, 24), (35, 24), (29, 20)], R[2])
    for x, y in ((27, 15), (28, 17), (51, 16), (50, 18), (29, 19), (49, 20)): K.put(col, x, y, R[3])
    outline(col, 0x08040a)
    # bat wings on the staff head, either side of the (now blood-red) gem
    WING = {'o': 0x0a060c, 'w': 0x2a1a2e, 'r': R[2]}
    K.stamp(N['staff'], 2, 9, ["o.....",
                               "oo...o",
                               "owo.oo",
                               "owwoww",
                               "owwwwo",
                               ".orwwo",
                               "..oro."], WING, only_empty=True)
    K.stamp(N['staff'], 19, 8, [".....o",
                                "o...oo",
                                "oo.owo",
                                "wwowwo",
                                "owwwwo",
                                "owwro.",
                                ".oro.."], WING, only_empty=True)
    # the cloak's hem cut into bat-wing scallops
    scallop(N['cape'], 3, R[2]); scallop(N['bskirt'], 2, R[2], 4, 50); scallop(N['fskirt'], 2, R[2], 4, 50)
    return [('collar', col, 'torso', (38, 21), 10.5)], {'collar'}, None

def mw_sakura(N, L):
    P = {'o': 0x8a2a4a, '1': 0xe86a9a, '2': 0xffb0cc, '3': 0xffe4ee, 'y': 0xffe060, 'b': 0x4a2a1a, 'B': 0x6a3e24}
    FLOWER = [".2.", "2y2", ".1."]
    BIG = [".22.", "23y2", "2y31", ".11."]
    # a blossom branch along his hat brim
    h = N['head']
    for x in range(30, 50): K.put(h, x, 10 + (1 if 36 <= x <= 43 else 0) - (1 if x > 46 else 0), P['b'] if x % 3 else P['B'])
    for (x, y, art) in ((29, 7, BIG), (34, 8, FLOWER), (40, 9, BIG), (45, 7, FLOWER), (48, 9, FLOWER)): K.stamp(h, x, y, art, P)
    # blossoms up the staff, and a big bloom round the gem
    ax, ay, bx, by = 14, 15, 59, 33
    for t in (0.22, 0.4, 0.62, 0.8):
        x, y = round(ax + (bx - ax) * t), round(ay + (by - ay) * t)
        K.stamp(N['staff'], x - 1, y - 3, FLOWER, P)
    K.stamp(N['staff'], 8, 8, ["..2.2..", ".2121..", "212y212", ".2y3y2.", "212y212", ".21212.", "..2.2.."], P, only_empty=True)
    # blossom prints scattered over the robe and cloak
    for n in ('cape', 'bskirt', 'fskirt'):
        lay = N[n]; spots = []
        ys, xs = np.nonzero(lay[..., 3] > 0)
        for x, y in sorted(zip(xs, ys)):
            if all(lay[y + dy, x + dx, 3] for dx in range(3) for dy in range(3) if y + dy < 64 and x + dx < 64) and all(abs(x - a) + abs(y - b) > 11 for a, b in spots) and (x * 5 + y * 3) % 4 == 0:
                spots.append((x, y)); K.stamp(lay, x, y, FLOWER, P, only_full=True)
    return [], set(), None

def mw_plague(N, L):
    B = {'o': 0x1a120a, '1': 0x5a3a1e, '2': 0x8a6438, '3': 0xb8925a, '4': 0xe0c890}
    # the long beaked mask, out from his face
    K.stamp(N['head'], 42, 14, ["oooo.....",
                                "3442oo...",
                                "23332ooo.",
                                "1222233oo",
                                ".oo11122o",
                                "....oooo."], B)
    # the white mask becomes leather like the beak; its dark eye holes become green glass goggles
    hd = N['head']; mask = []
    for y in range(8, 22):
        for x in range(32, 46):
            if hd[y, x, 3]:
                r, g_, b = (int(c) for c in hd[y, x, :3]); h_, s_, v = K._rgb2hsv(r, g_, b)
                if v > 0.7 and s_ < 0.2: mask.append((x, y)); hd[y, x, :3] = K.hexrgb(0xd8bc84 if v > 0.9 else 0xb8925a)
    near = {(x + dx, y + dy) for x, y in mask for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
    for x, y in near:
        if (x, y) not in mask and hd[y, x, 3] and K.shade_of(hd[y, x]) < 0.2 and 34 <= x <= 44: K.put(hd, x, y, 0x123a22)
    # the gem becomes a lantern: an iron cage round it, a hook on top
    K.stamp(N['staff'], 10, 10, ["...oo...",
                                 "..o..o..",
                                 "oooooooo",
                                 "o......o",
                                 "o......o",
                                 "o......o",
                                 "o......o",
                                 "o......o",
                                 "o......o",
                                 "o......o",
                                 "oooooooo",
                                 "..oooo.."], {'o': 0x2a2a2a}, only_empty=True)
    return [], set(), None

MW_LOOKS = {
    'vampire': (mw_vampire, {'robe': {'to': 350, 'sat': 1.15, 'val': 0.55}, 'magic': {'to': 356, 'sat': 1.2, 'val': 1.15}, 'cloth': {'to': 330, 'sat': 0.6, 'val': 0.45}, 'wood': {'sat': 0.1, 'val': 1.3}}),
    'plague': (mw_plague, {'robe': {'to': 150, 'sat': 0.25, 'val': 0.42}, 'magic': {'to': 118, 'sat': 1.1, 'val': 1.15}, 'cloth': {'to': 28, 'sat': 0.9, 'val': 1.1}, 'wood': {'to': 20, 'sat': 0.3, 'val': 0.6}}),
    'sakura': (mw_sakura, {'robe': {'to': 334, 'sat': 0.55, 'val': 1.9}, 'magic': {'to': 340, 'sat': 0.4, 'val': 1.3}, 'cloth': {'to': 300, 'sat': 0.9, 'val': 1.3}, 'wood': {'to': 18, 'sat': 0.7, 'val': 0.8}}),
}

def build_mw(name):
    import mw_rig, mr_wake_moves as MWM
    edit, rules = MW_LOOKS[name]
    src = os.path.join(FIG, 'mr-wake')
    base = np.array(Image.open(os.path.join(src, 'idle_sheet.png')).convert('RGBA'))[:64, :64]
    L = mw_rig.layers_from(base)
    fn = K.color_fn(MWG, rules); rc = lambda a: K.recolor(a, MWG, rules, fn)
    N = {n: rc(L[n]) for n in L}
    extras, behind, paint = edit(N, L)
    small, big = K.rig_from(N, mw_rig.ORDER, mw_rig.PARENT, mw_rig.FEET, (176, 120), (56, 48), follow=MWM.FOLLOW, upright={'cape': 0.5}, extras=extras)
    nbase = rc(base)
    real = mw_rig.build_rig
    mw_rig.build_rig = lambda *a, **kw: (small, big, N, nbase)
    os.makedirs(os.path.join(src, name), exist_ok=True)
    try: moves, _ = MWM.build('idle_sheet.png', name)
    finally: mw_rig.build_rig = real
    out = os.path.join(src, name)
    parts = [p for p in mw_rig.ORDER if L[p][..., 3].any()]
    for strip in ('idle', 'run'):
        frames = K.strip_frames(Image.open(os.path.join(src, strip + '_sheet.png')), 64, 64)
        res = [K.graft(f, L, N, rc, extras, parts=parts, search=4 if strip == 'idle' else 7, behind=behind, paint=paint) for f in frames]
        K.save_strip(res, os.path.join(out, strip + '_sheet.png'), 64, 64)
    return moves


# ====================================================================== LACY
def hk_helpers():
    import importlib.util
    path = os.path.join(os.path.dirname(__file__), 'hero_knight_samurai.py')
    src = open(path).read(); ns = {'__file__': path}
    exec(src[:src.index("od = os.path.join")], ns)          # just the helpers (anchor, blade finding...), not the samurai run
    return ns

def hk_look(frame, H, look, fallback=None):
    FW, FH = H['FW'], H['FH']
    hsv, ramp, is_red, is_plate, is_cloth, is_grey = H['hsv'], H['ramp'], H['is_red'], H['is_plate'], H['is_cloth'], H['is_grey']
    BLADE = H['BLADE']
    out = frame.copy(); px = out.load(); src = frame.load()
    a = H['anchor'](frame) or fallback
    if not a: return out
    ax, ay = round(a[0]), round(a[1])
    blade = set(H['blade_pixels'](src))
    helmet = lambda x, y: ax - 6 <= x <= ax + 10 and ay - 11 <= y <= ay and is_grey(src[x, y]) and src[x, y][:3] not in BLADE
    helm_pts = []
    for y in range(FH):
        for x in range(FW):
            p = src[x, y]
            if p[3] == 0: continue
            if p[3] < 255 and p[:3] == (255, 255, 255): px[x, y] = look['swipe'] + (p[3],); continue
            h, s_, v = hsv(p)
            inside = all(0 <= x + dx < FW and 0 <= y + dy < FH and is_plate(src[x + dx, y + dy]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if is_plate(p): px[x, y] = look['plate'](x - ax, y - ay, v, inside) + (255,)
            elif is_cloth(p): px[x, y] = ramp(look['cloth'], v, 0.2, 0.32) + (255,)
            elif is_red(p): px[x, y] = ramp(look['scarf'], v, 0.4, 0.56) + (255,)
            elif helmet(x, y): px[x, y] = ramp(look['helm'], v, 0.26, 0.66) + (255,); helm_pts.append((x, y))
            elif (x, y) in blade or p[:3] in BLADE: px[x, y] = look['blade']((x, y), v) + (255,)
            elif is_grey(p) and v < 0.68 and x >= ax - 2 and y > ay - 4: px[x, y] = ramp(look['glove'], v, 0.26, 0.66) + (255,)
            elif is_grey(p) and v >= 0.68 and look.get('hair'): px[x, y] = look['hair'](v) + (255,)
    if blade and look.get('glow'):                                  # a glow round the blade
        for (x, y) in blade:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < FW and 0 <= Y < FH and src[X, Y][3] == 0 and px[X, Y][3] == 0: px[X, Y] = look['glow']
    if helm_pts and look.get('crown'): look['crown'](px, src, helm_pts, FW, FH)
    return out

def horns(px, src, pts, FW, FH):
    """two obsidian horns sweeping up and back off her helmet, glowing at the tips"""
    top = min(y for x, y in pts); xs = [x for x, y in pts if y <= top + 1]; tx = round(sum(xs) / len(xs))
    D, M, T = (34, 22, 40), (70, 46, 80), (255, 150, 40)
    for side, path in ((-1, [(0, 0), (0, -1), (-1, -2), (-1, -3), (-2, -4), (-3, -4)]), (1, [(0, 0), (0, -1), (1, -2), (1, -3), (2, -4), (3, -5)])):
        bx = tx + side * 3
        for i, (dx, dy) in enumerate(path):
            X, Y = bx + dx, top + dy
            if 0 <= X < FW and 0 <= Y < FH and src[X, Y][3] < 255:
                px[X, Y] = (T if i >= len(path) - 1 else M if i % 2 else D) + (255,)
            if 0 <= X + side < FW and 0 <= Y < FH and i < 3 and src[X + side, Y][3] < 255: px[X + side, Y] = D + (255,)

def visor(px, src, pts, FW, FH):
    """a glowing cyan visor band across her helmet, poking out at the front"""
    top = min(y for x, y in pts); bot = max(y for x, y in pts); vy = top + max(2, (bot - top) // 2)
    row = [x for x, y in pts if y == vy]
    if not row: return
    for x in range(min(row), max(row) + 3):
        if 0 <= x < FW:
            px[x, vy] = (120, 250, 255, 255) if (x - min(row)) % 4 else (255, 255, 255, 255)
            if 0 <= vy + 1 < FH and src[x, vy + 1][3]: px[x, vy + 1] = (20, 160, 200, 255)

def obsidian_plate(dx, dy, v, inside):
    glass = [(16, 10, 22), (30, 20, 40), (50, 34, 62), (80, 56, 96), (130, 104, 150)]
    if inside and ((dx * 3 + dy * 5) % 13 == 0 or (dx * 5 - dy * 2) % 17 == 0): return (255, 120 + (dx * 7 + dy) % 3 * 40, 30)   # lava in the cracks
    return glass[min(4, int(max(0, v - 0.2) / 0.55 * 5))]

def obsidian_blade(p, v):
    x, y = p
    return (255, 200, 80) if (x + y) % 4 == 0 else (255, 110, 30) if (x + y) % 4 == 2 else (40, 26, 50)

def cyber_plate(dx, dy, v, inside):
    chrome = [(60, 70, 96), (110, 124, 150), (170, 186, 206), (220, 232, 244), (250, 252, 255)]
    if inside and (dy % 6 == 3 or (dx % 7 == 2 and dy % 6 > 3)): return (0, 230, 255)            # circuit lines
    return chrome[min(4, int(max(0, v - 0.2) / 0.55 * 5))]

def cyber_blade(p, v): return (255, 255, 255) if v > 0.77 else (255, 90, 220)

def leaf_crown(px, src, pts, FW, FH):
    """leaves sprouting from the top of her helmet"""
    top = min(y for x, y in pts); xs = sorted(x for x, y in pts if y <= top + 1)
    for i, x in enumerate(range(xs[0] - 1, xs[-1] + 2, 2)):
        h = 2 + (i % 2)
        for d in range(h):
            Y = top - 1 - d
            if 0 <= x < FW and 0 <= Y < FH and src[x, Y][3] < 255: px[x, Y] = ((90, 190, 70) if d < h - 1 else (180, 240, 110)) + (255,)

def verdant_plate(dx, dy, v, inside):
    bark = [(40, 26, 16), (70, 46, 26), (104, 72, 40), (140, 104, 60), (176, 140, 90)]
    if inside and ((dx * 2 + dy * 3) % 11 == 0 or (dx - dy) % 9 == 0): return (70, 140, 50) if v < 0.6 else (110, 180, 70)   # moss in the grain
    if inside and dy % 5 == 0: return (52, 34, 20)                                                     # bark ridges
    return bark[min(4, int(max(0, v - 0.2) / 0.55 * 5))]

def verdant_blade(p, v):
    x, y = p
    return (230, 255, 170) if (x + y) % 5 == 0 else (120, 240, 120) if v > 0.6 else (40, 150, 70)

HK_LOOKS = {
    'obsidian': dict(plate=obsidian_plate, cloth=[(10, 8, 12), (22, 18, 26)], scarf=[(200, 60, 10), (255, 140, 30), (255, 220, 120)],
                     helm=[(14, 10, 20), (30, 20, 40), (54, 38, 66), (90, 66, 106)], glove=[(14, 10, 20), (30, 20, 40), (54, 38, 66), (90, 66, 106)],
                     blade=obsidian_blade, swipe=(255, 160, 90), crown=horns, hair=lambda v: (int(232 * v), int(214 * v), int(200 * v)), glow=(255, 110, 30, 110)),
    'verdant': dict(plate=verdant_plate, cloth=[(14, 30, 18), (28, 52, 30)], scarf=[(40, 110, 40), (90, 170, 60), (190, 230, 110)],
                    helm=[(20, 40, 20), (40, 80, 36), (70, 120, 50), (110, 160, 80)], glove=[(40, 26, 16), (70, 46, 26), (104, 72, 40), (140, 104, 60)],
                    blade=verdant_blade, swipe=(170, 255, 150), crown=leaf_crown, hair=lambda v: (int(240 * v), int(200 * v), int(120 * v)), glow=(120, 255, 120, 100)),
    'cyber': dict(plate=cyber_plate, cloth=[(10, 12, 26), (22, 26, 48)], scarf=[(150, 10, 120), (255, 42, 216), (255, 160, 240)],
                  helm=[(10, 12, 22), (24, 28, 44), (46, 52, 76), (80, 90, 120)], glove=[(10, 12, 22), (24, 28, 44), (46, 52, 76), (80, 90, 120)],
                  blade=cyber_blade, swipe=(255, 150, 240), crown=visor, hair=lambda v: (int(140 * v), int(250 * v), 255), glow=(255, 60, 210, 120)),
}

def build_hk(name):
    H = hk_helpers(); d = H['DIR']; od = os.path.join(d, name); os.makedirs(od, exist_ok=True)
    FW, FH = H['FW'], H['FH']
    for strip in H['STRIPS']:
        sheet = Image.open(os.path.join(d, strip + '_sheet.png')).convert('RGBA')
        res = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
        for i in range(sheet.width // FW):
            res.alpha_composite(hk_look(sheet.crop((i * FW, 0, (i + 1) * FW, FH)), H, HK_LOOKS[name], H['ANCHOR_FALLBACK'].get((strip, i))), (i * FW, 0))
        res.save(os.path.join(od, strip + '_sheet.png'))
    # her moves sheet: hero_knight_moves.py (its COSTUMES list includes this costume)


# ====================================================================== NU and AERO (drawn in parts)
NUG = {'acid': {'h': (65, 105), 's': (0.35, 1), 'v': (0.3, 1), 'center': 84}, 'hair': {'h': (38, 62), 's': (0.06, 0.5), 'v': (0.6, 1), 'center': 48},
       'cloth': {'h': (230, 300), 's': (0.05, 0.35), 'v': (0.1, 0.4), 'center': 258}}
AEG = {'aqua': {'h': (180, 215), 's': (0.3, 1), 'v': (0.3, 1), 'center': 196}, 'lime': {'h': (75, 110), 's': (0.3, 1), 'center': 92},
       'fish': {'h': (10, 40), 's': (0.5, 1), 'v': (0.5, 1), 'center': 24}}

def nu_vapor(N):
    # hair: pastel pink fading into teal
    h = N['hair']; ys, xs = np.nonzero(h[..., 3] > 0)
    for x, y in zip(xs, ys):
        v = K.shade_of(h[y, x])
        h[y, x, :3] = K.hexrgb(K.ramp_pick([0xb04a9a, 0xff7ad0, 0xffb8e8, 0xffe8f6] if y <= 4 else [0x2a8a9a, 0x4ad0d8, 0x9af0f0, 0xe0ffff], v, 0.3, 1.0))
    # shutter shades with gradient lenses: pink, violet, cyan - and a glint
    hd = N['head']
    for y, col in ((11, 0xff6ac8), (12, 0xb47aff), (13, 0x5ae6ff)):
        for x in range(26, 41):
            if hd[y, x, 3] and K.shade_of(hd[y, x]) < 0.25: hd[y, x, :3] = K.hexrgb(col)
    for x in range(26, 41):
        if hd[11, x, 3] and tuple(hd[11, x, :3]) == K.hexrgb(0xff6ac8): K.put(hd, x, 11, 0xffffff); break
    # a sunset print on the hoodie: a striped sun over a grid line
    K.stamp(N['torso'], 29, 25, ["..yyyy..",
                                 ".yyyyyy.",
                                 "pppppppp",
                                 "........",
                                 "oooooooo",
                                 ".mmmmmm.",
                                 "........",
                                 "cccccccc"], {'y': 0xffe27a, 'p': 0xffa07a, 'o': 0xff6aa0, 'm': 0xd84ab8, 'c': 0x5af0f0}, only_full=True)

def aero_sunset(N):
    hd = N['head']; yy = np.arange(64)[:, None] + np.zeros((1, 64), int)
    SKY = [0x6a3aa8, 0x9a4ab8, 0xd85ab0, 0xff7a9a, 0xff9a7a, 0xffbe7a]
    glass = (hd[..., 3] > 0) & (yy >= 5) & (yy < 13) & ~np.all(hd[..., :3] == (255, 255, 255), -1) & (hd[..., :3].max(-1) > 80)
    for y, x in zip(*np.nonzero(glass)): hd[y, x, :3] = K.hexrgb(SKY[min(5, (y - 5) * 6 // 8)])
    r, _ = rad(28, 13)                                       # the sun setting into the water
    sun = (r <= 4) & (yy <= 13) & (hd[..., 3] > 0) & (hd[..., :3].max(-1) > 80)
    hd[sun & (r > 2.6), :3] = K.hexrgb(0xffd25a); hd[sun & (r <= 2.6), :3] = K.hexrgb(0xfff2a8)
    sea = (hd[..., 3] > 0) & (yy >= 14) & (yy <= 20) & (hd[..., :3].max(-1) > 80)
    for y, x in zip(*np.nonzero(sea)):
        if (x + y * 3) % 7 == 0: hd[y, x, :3] = K.hexrgb(0xffd8a0)    # sun sparkles on the water
    # the goldfish wears sunglasses
    K.stamp(N['fish'], 34, 13, ["kkkk", ".kp."], {'k': 0x14101c, 'p': 0x8a3aa8})
    # the chest orb becomes a sun with rays
    K.stamp(N['torso'], 29, 23, ["....y....", ".y.....y.", "........."], {'y': 0xffe27a}, only_full=True)
    for x, y in ((29, 28), (37, 28), (30, 31), (36, 31)): K.put(N['torso'], x, y, 0xffe27a) if N['torso'][y, x, 3] else None
    # the leaf scarf becomes a palm frond: notched along its edges
    sc = N['scarf']; m = sc[..., 3] > 0
    edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0))
    for y, x in zip(*np.nonzero(edge)):
        if x % 3 == 0 and x < 26: sc[y, x] = 0

def nu_glam(N):
    # platinum hair with hot-pink tips
    h = N['hair']; ys, xs = np.nonzero(h[..., 3] > 0); top = ys.min() if len(ys) else 0
    for x, y in zip(xs, ys):
        v = K.shade_of(h[y, x])
        h[y, x, :3] = K.hexrgb(K.ramp_pick([0xb02a8a, 0xff4ab8, 0xff9ad8, 0xffe0f4] if y >= top + 9 else [0x8a8aa8, 0xc8c8e0, 0xececf8, 0xffffff], v, 0.3, 1.0))
    # a lightning bolt painted down his cheek, and star-shaped lens glints
    hd = N['head']
    for (x, y, c) in ((37, 15, 0x3ad8ff), (36, 16, 0x3ad8ff), (37, 16, 0xffffff), (36, 17, 0x3ad8ff), (35, 18, 0x3ad8ff)):
        if hd[y, x, 3]: K.put(hd, x, y, c)
    for y in range(11, 15):
        for x in range(30, 42):
            if hd[y, x, 3] and K.shade_of(hd[y, x]) < 0.25: hd[y, x, :3] = K.hexrgb(0xff4ab8 if (x + y) % 3 else 0xffd8f0)
    # a glittering gold jacket: sparkles over the cloth
    for n in ('torso', 'bupper', 'fupper', 'bfore', 'ffore'):
        lay = N.get(n)
        if lay is None: continue
        ys, xs = np.nonzero(lay[..., 3] > 0)
        for x, y in zip(xs, ys):
            r, g_, b = (int(c) for c in lay[y, x, :3]); hh, ss, vv = K._rgb2hsv(r, g_, b)
            if 30 <= hh <= 60 and ss > 0.35 and (x * 7 + y * 3) % 9 == 0: lay[y, x, :3] = (255, 250, 210)

def aero_midnight(N):
    hd = N['head']; yy = np.arange(64)[:, None] + np.zeros((1, 64), int)
    SKY = [0x060820, 0x0a1030, 0x101a44, 0x182658, 0x22346c, 0x2a427a]
    glass = (hd[..., 3] > 0) & (yy >= 3) & (yy < 13) & (hd[..., :3].max(-1) > 80)
    for y, x in zip(*np.nonzero(glass)):
        hd[y, x, :3] = K.hexrgb(SKY[min(5, max(0, (y - 3) * 6 // 10))])
        if (x * 13 + y * 7) % 23 == 0: hd[y, x, :3] = (255, 255, 255)                 # stars inside the dome
    r, _ = rad(36, 7); r2, _ = rad(38, 6)                                             # a crescent moon
    moon = (r <= 3) & (r2 > 2.6) & (hd[..., 3] > 0)
    hd[moon, :3] = K.hexrgb(0xfff4c8)
    sea = (hd[..., 3] > 0) & (yy >= 13) & (yy <= 22) & (hd[..., :3].max(-1) > 60)
    for y, x in zip(*np.nonzero(sea)):
        if abs(x - 36) <= 1 and (y % 2 == 0): hd[y, x, :3] = K.hexrgb(0xfff4c8)     # the moon's path on the water
    # the goldfish in a nightcap (drawn on the dome, just over where the fish swims)
    K.stamp(hd, 33, 9, [".....w", "...bb.", ".bbbbb"], {'b': 0xe84a5a, 'w': 0xffffff})
    # the scarf: midnight blue, little stars
    sc = N['scarf']; ys, xs = np.nonzero(sc[..., 3] > 0)
    for x, y in zip(xs, ys):
        if (x * 5 + y * 11) % 17 == 0: sc[y, x, :3] = (255, 244, 200)

PART_LOOKS = {
    'vapor': ('nu', 'nu_draw', NUG, {'acid': {'to': 318, 'sat': 0.8, 'val': 1.1}, 'hair': {'hue': 184, 'sat': 0.9, 'val': 1.05}, 'cloth': {'to': 270, 'sat': 1.6, 'val': 1.3}}, nu_vapor, (255, 122, 208)),
    'glam': ('nu', 'nu_draw', NUG, {'acid': {'to': 322, 'sat': 1.1, 'val': 1.15}, 'hair': {'sat': 0.2, 'val': 1.2}, 'cloth': {'to': 44, 'sat': 2.4, 'val': 2.2}}, nu_glam, (255, 74, 184)),
    'midnight': ('aero', 'aero_draw', AEG, {'aqua': {'to': 232, 'sat': 1.0, 'val': 0.6}, 'lime': {'to': 268, 'sat': 0.5, 'val': 1.1}, 'fish': {'to': 44, 'sat': 0.9, 'val': 1.15}}, aero_midnight, (122, 150, 255)),
    'sunset': ('aero', 'aero_draw', AEG, {'aqua': {'to': 24, 'sat': 1.0, 'val': 1.05}, 'lime': {'to': 322, 'sat': 0.9}, 'fish': {'to': 2, 'sat': 1.1, 'val': 1.0}}, aero_sunset, (255, 154, 90)),
}

def build_parts(name):
    import importlib, types
    fighter, mod, groups, rules, edit, ghost = PART_LOOKS[name]
    D = importlib.import_module(mod)
    fn = K.color_fn(groups, rules)
    layers = {n: K.recolor(a, groups, rules, fn) for n, a in D.draw_parts().items()}
    edit(layers)
    look = types.SimpleNamespace(draw_parts=lambda: {n: a.copy() for n, a in layers.items()}, composite=D.composite, ORDER=D.ORDER, RIG=D.RIG)
    out = os.path.join(FIG, fighter, name)
    if fighter == 'nu':
        import nu_moves as M
        small, big = M.build_rig(look, M.FOLLOW)
        M.GHOST = ghost
        return M.build_all(small, big, M.MOVES, out, os.devnull, 'NU_MOVES', 'nu_moves.py')
    import aero_moves as A
    small, big = A.N.build_rig(look, A.FOLLOW)
    A.N.GHOST = ghost
    return A.N.build_all(small, big, A.MOVES, out, os.devnull, 'AERO_MOVES', 'aero_moves.py', life_fn=A.life, idle=A.idle_keys)

# ====================================================================== run
LOOKS = {'eclipse': build_ss, 'aurora': build_ss, 'celestial': build_ss, 'vampire': build_mw, 'sakura': build_mw, 'plague': build_mw,
         'obsidian': build_hk, 'cyber': build_hk, 'verdant': build_hk, 'vapor': build_parts, 'glam': build_parts, 'sunset': build_parts, 'midnight': build_parts}

if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if a in LOOKS] or list(LOOKS)
    for n in names:
        LOOKS[n](n)
        print(n, 'done')
