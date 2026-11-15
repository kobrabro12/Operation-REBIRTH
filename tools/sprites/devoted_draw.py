"""THE DEVOTED (WIP test fighter) - a quiet, pale man with a kitchen knife who prays to a symbol, and a black
sludge that takes a little more of her every time she does. Four looks, one per sludge stage:

  DEFAULT  clean: long ashy-blond hair, a striped mustard shirt, dark trousers, a karambit, a faint smile
  SEMI     sludge drips from her hair down her face and shoulders; the smile widens
  TAKEN    most of her is covered; a wide toothy grin
  DROWNED  she's all sludge but her eyes and a huge grin - and one giant demon wing grows from her back

Built on AERO's skeleton (tools/sprites/aero_moves.py: the same parts and the same moves, minus FULL AERO's
spear moves); her move table is src/fighters/dvMoves.js (generated here). The karambit is drawn into her front fist; the scarf slot is the demon wing (DROWNED) or a sludge strand.

  python3 tools/sprites/devoted_draw.py [--preview FILE]
  -> public/assets/fighters/devoted/ (DEFAULT) and devoted/semi/, devoted/taken/, devoted/drowned/
"""
import os, sys, math, shutil, types
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import aero_draw as D
import legs_kit as LK
import aero_moves as A

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/fighters/devoted')
STAGES = ['default', 'semi', 'taken', 'drowned']

def hx(c): return np.array([c >> 16 & 255, c >> 8 & 255, c & 255, 255], np.uint8)
LINE = 0x1a1418
SHIRT = [0x6e5e24, 0x96823a, 0xbca452, 0xd8c47a]       # a faded mustard long-sleeved shirt, shadow -> light
STRIPE = [0x3a2c18, 0x4e3c20, 0x5e4a28, 0x6e5830]      # its dark brown stripes
PANTS = [0x22222a, 0x2e2e38, 0x3c3c48, 0x4a4a58]
SHOE = [0x141216, 0x1e1c22, 0x2a2830, 0x36343c]
SKIN = [0xa88e7e, 0xc8ad9c, 0xe0c8b6, 0xf0dccc]
HAIR = [0x7a6c50, 0x9e8e68, 0xc2b48a, 0xddd2a8]       # long, straight, ashy-blond hair
SLUDGE = [0x060508, 0x0e0c12, 0x1a1720, 0x2e2a38]     # black sludge, with an oily sheen
SHEEN = 0x4a4458
# MAD MURDER (costume, `--set murder`): a grimy white shirt soaked in blood, and a smiling mask with a crack
# through it, one wild eye staring out of the crack
VARIANT = ''
MURDER_SHIRT = [0x7e786c, 0x9c9688, 0xbab4a4, 0xd4cfc0]
BLOOD = [0x3a0608, 0x5e0c10, 0x861418, 0xa8201e]
MASK = [0xb8b0a0, 0xd0c8b8, 0xe4ddce, 0xf4efe4]

# ---- the drawn costumes (`--set NAME`): each swaps her palettes, may shade her in flat polygons (`facet`, px),
# repaints its sludge (`sludge` ramp + `sheen`), recolours DROWNED's wing (`wing`: base, alt, bone, claw) and has
# its own touches in head() / knife() / dress() below.
#   CARTRIDGE    an original low-poly 64-bit-era adventurer: flat-shaded polygons, bold primaries - a teal jacket with a
#                yellow zig-zag, purple trousers, chunky orange boots, a blocky orange ponytail, big texture-painted eyes
#                and a crystal blade; her sludge is CORRUPTED DATA (black-violet polygons with cyan glitch edges)
#   HOLLOW BRIDE an abandoned bride: a lace wedding dress gone grey at the hem, a torn veil, jet-black hair, pale skin,
#                black tears, a bouquet of dead roses in her free hand and a red rose at her breast; DROWNED's wing is a
#                tattered ivory veil-wing
#   EMBER SAINT  a burning martyr: charred skin split by glowing cracks, a crimson robe with gold trim, hair of fire, a
#                floating gold halo, eyes like coals and a white-hot blade; her sludge is MAGMA, her wing a burnt ember wing
VARIANTS = {
    'cartridge': dict(shirt=[0x0a5a64, 0x109098, 0x2ac8c0, 0x8af4ea], stripe=None, pants=[0x3a0e5a, 0x641c90, 0x9038c0, 0xc070f0],
                      shoe=[0x7a2a04, 0xc85a0c, 0xff9420, 0xffd060], skin=[0xb8704a, 0xe09464, 0xf8b884, 0xffdcb0],
                      hair=[0x8a2a04, 0xc8480c, 0xf47a1c, 0xffb050], sludge=[0x0c0418, 0x1c0838, 0x3a1070, 0x20e8ff], sheen=0xff3ad8,
                      facet=0, poly=True, wing=(0x1c0838, 0x3a1070, 0x20e8ff, 0xff3ad8), blade=[0x0a6aa0, 0x30b8f0, 0x90f0ff, 0xffffff]),
    'bride': dict(shirt=[0x7a7468, 0xaaa496, 0xd6d0c2, 0xf6f2e6], stripe=None, pants=[0x6a645a, 0x9a9488, 0xc8c2b4, 0xeae6da],
                  shoe=[0x8a8478, 0xb4ae9e, 0xdcd6c6, 0xfaf6ea], skin=[0x7a8690, 0x9aa6b0, 0xbcc6ce, 0xdae2e8],
                  hair=[0x08080e, 0x121218, 0x1e1e28, 0x343442], sludge=[0x050408, 0x0c0a10, 0x18151e, 0x3a3448], sheen=0x5a5068,
                  wing=(0xd6d0c2, 0xb4ae9e, 0x7a7468, 0xf6f2e6), blade=[0x5a5e6a, 0x9aa0ac, 0xd4d8e0, 0xffffff]),
    'ember': dict(shirt=[0x4a0806, 0x7a120c, 0xae2214, 0xd8422a], stripe=[0x8a5a0a, 0xc8901a, 0xf0c03a, 0xfff07a], pants=[0x1a0e0c, 0x2a1814, 0x3a2420, 0x4e322a],
                  shoe=[0x120a08, 0x1e1210, 0x2c1c18, 0x3c2820], skin=[0x2a1a16, 0x40281e, 0x5a3626, 0x7a4c34],
                  hair=[0xa81808, 0xe84a10, 0xff9a20, 0xffe070], sludge=[0x140604, 0x2a0a06, 0x5a1408, 0xff6a10], sheen=0xffb040,
                  wing=(0x140604, 0x2a0a06, 0xff6a10, 0xffe070), blade=[0xa82808, 0xf06010, 0xffb040, 0xfff4c0]),
    # CINDER WRAITH: a hooded wanderer out of a burnt desert - sand-coloured wraps bound round her arms and legs, a hood,
    # a cracked ash-grey mask over her eyes with embers glowing through it, a blade of cooling lava; her sludge is
    # smoke and ash with embers in it, and DROWNED's wing is a sheet of smoke ribbed with glowing cinders
    'cinder': dict(shirt=[0x5e4e3a, 0x8c765a, 0xb89e7a, 0xdcc8a2], stripe=None, pants=[0x3a3026, 0x56483a, 0x766450, 0x96826a],
                   shoe=[0x26221e, 0x3a3430, 0x56504a, 0x766e66], skin=[0x5a3a28, 0x7a5038, 0x9a6a4a, 0xbc8a64],
                   hair=[0x161414, 0x262222, 0x3a3434, 0x564e4c], sludge=[0x0c0a0a, 0x1c1818, 0x36302e, 0xff7a1a], sheen=0xffa040,
                   wing=(0x1c1818, 0x36302e, 0xff7a1a, 0xffd080), blade=[0x7a1604, 0xd8480c, 0xffa030, 0xfff0b8]),
    # --- three lore costumes (each tied to her story; see SKIN_LORE in src/data/lore.js) ---
    # HEARTWOOD: her symbol, the dying tree, has grown into her - bark-plated skin split by glowing amber sap, branches
    # rising from her shoulders, dead leaves for hair, a weeping knot where her mouth was, a black thorn for a blade
    'heartwood': dict(shirt=[0x2a1a10, 0x4a3220, 0x6a4a30, 0x8a6a48], stripe=None, pants=[0x1e140c, 0x34241a, 0x4a3626, 0x62503a],
                      shoe=[0x1a120a, 0x2e2014, 0x46321e, 0x5e4a30], skin=[0x7a6a54, 0x9a8a70, 0xb8a88a, 0xd6c8a8],
                      hair=[0x4a2a10, 0x7a4a1a, 0xa86a2a, 0xd8a050], sludge=[0x0a0604, 0x1a1008, 0x3a2410, 0xffb030], sheen=0xffb030,
                      wing=(0x2a1a10, 0x4a3220, 0xffb030, 0xd8a050), blade=[0x140c06, 0x2a1a0e, 0x5a3a1e, 0xc89a5a]),
    # FORGEBOUND: the smith of the faithful - she forges every karambit they carry and quenches each one in the sludge.
    # A soot-black tunic with the sleeves rolled to the elbow, scarred forearms, a heavy leather apron and breeches,
    # forge goggles pushed up on a red head-cloth, a hammer at her hip; her blade comes straight off the anvil, still
    # glowing; her sludge is slag and cooling iron, her wing a fan of hammered iron plates with molten seams
    'forge': dict(shirt=[0x1a1614, 0x2a2420, 0x3e3630, 0x564c44], stripe=None, pants=[0x241810, 0x3a2618, 0x523822, 0x6a4c30],
                  shoe=[0x140e0a, 0x22180e, 0x342416, 0x48341e], skin=[0x8a5038, 0xb06a48, 0xd08a60, 0xeaaa7a],
                  hair=[0x3a140c, 0x5a2414, 0x82361c, 0xa84e28], sludge=[0x0a0606, 0x1a0e0a, 0x3a1a10, 0xff7a1a], sheen=0xff9a30,
                  wing=(0x2a2a2e, 0x4a4a52, 0xff7a1a, 0xffd080), blade=[0x8a1a04, 0xe0500c, 0xffa030, 0xfff0b8]),
    # THE LAST KEEPER: she kept the lighthouse that watched the black tide come in, and kept the light lit after - a
    # sea-green oilskin coat with brass buttons, a rope over her shoulder, a wide oilskin rain hat, a brass lantern
    # glowing at her hip, barnacled boots, lamp-amber eyes and a whalebone hook; her sludge is the black tide, flecked
    # with sea foam, her wing a mass of kelp and torn net
    'keeper': dict(shirt=[0x0e2a26, 0x1a4640, 0x2a6a5e, 0x4a9484], stripe=None, pants=[0x101a1e, 0x1c2a30, 0x2c3e46, 0x40565e],
                   shoe=[0x1a1410, 0x2e241c, 0x46382a, 0x5e4e3c], skin=[0x6a4a3a, 0x8a6450, 0xa8806a, 0xc8a088],
                   hair=[0x3a3e42, 0x5e6468, 0x8a9094, 0xb8bec2], sludge=[0x040a0e, 0x0a1820, 0x16303a, 0xd8f0f0], sheen=0x8ae0e0,
                   wing=(0x0e2a1a, 0x1a4a2a, 0x6aa86a, 0xd8f0f0), blade=[0x8a8070, 0xb8ae98, 0xe0d8c4, 0xfffaf0]),
}
AMBER = [0xc86a10, 0xf09a20, 0xffc040, 0xffe890]     # HEARTWOOD's sap
IRON = [0x2a2a2e, 0x4a4a52, 0x6e6e78, 0x9a9aa6]      # FORGEBOUND's tools and wing
LEATHER = [0x2a180c, 0x4a2c16, 0x6a4222, 0x8a5a30]   # ...and her apron
BRASS = [0x6a4a14, 0xa8781e, 0xd8a838, 0xfff0a0]     # THE LAST KEEPER's lantern and buttons
ASH = [0x5a5654, 0x8a8682, 0xb4b0aa, 0xd8d4cc]       # CINDER WRAITH's mask
HOOD = [0x4a3c2c, 0x76624a, 0xa08868, 0xc8b28c]      # ...and her hood
FACET = 0
FLAT3D = False          # set by devoted_3d.py: paint CARTRIDGE flat (its 3D model does the lighting)

def bloody(x, y, seed, heavy=0.0):
    """Is this pixel splashed with blood? (MAD MURDER) - spatters, plus heavier soaking lower down."""
    return blob(x, y, seed + 21) + heavy * (y / 64) > 0.78 or noise(x, y, seed + 22) > 0.95

# how much of her the sludge covers at each stage (0 = none, 1 = all of her)
COVER = [0.0, 0.34, 0.6, 1.0]
# which parts are what (the shading ramp they get)
KIND = {'torso': SHIRT, 'bupper': SHIRT, 'fupper': SHIRT, 'bfore': SHIRT, 'ffore': SHIRT, 'bfist': SKIN, 'ffist': SKIN,
        'bthigh': PANTS, 'fthigh': PANTS, 'bshin': SHOE, 'fshin': SHOE, 'bshoe': SHOE, 'fshoe': SHOE}

def apply_variant(name):
    """Switches the module's palettes to a drawn costume's (see VARIANTS) - before anything is drawn."""
    global VARIANT, SHIRT, STRIPE, PANTS, SHOE, SKIN, HAIR, SLUDGE, SHEEN, KIND, FACET
    VARIANT = name; v = VARIANTS.get(name)
    if not v: return
    SHIRT, PANTS, SHOE, SKIN, HAIR = v['shirt'], v['pants'], v['shoe'], v['skin'], v['hair']
    if v.get('poly'): SHIRT, PANTS, SHOE, SKIN, HAIR = (expand(r) for r in (SHIRT, PANTS, SHOE, SKIN, HAIR))
    STRIPE = SHIRT; SLUDGE = v['sludge']; SHEEN = v['sheen']; FACET = v.get('facet', 0)
    KIND = {'torso': SHIRT, 'bupper': SHIRT, 'fupper': SHIRT, 'bfore': SHIRT, 'ffore': SHIRT, 'bfist': SKIN, 'ffist': SKIN,
            'bthigh': PANTS, 'fthigh': PANTS, 'bshin': SHOE, 'fshin': SHOE, 'bshoe': SHOE, 'fshoe': SHOE}
    if name == 'forge': KIND['bfore'] = KIND['ffore'] = SKIN                      # (FORGEBOUND: sleeves rolled to the elbow)

LIGHT = np.array([-0.62, -0.68, 0.4]) / np.linalg.norm([-0.62, -0.68, 0.4])   # CARTRIDGE's light: up, left, a little toward us

def expand(r, n=7):
    """A 4-colour ramp stretched to n tones, from a deep shadow below its darkest to a highlight above its lightest
    (CARTRIDGE's 3D lighting needs more steps)."""
    cs = [np.array([c >> 16 & 255, c >> 8 & 255, c & 255], float) for c in r]
    stops = [cs[0] * 0.55] + cs + [np.minimum(255, cs[3] * 1.12 + 12)]
    out = []
    for i in range(n):
        f = i / (n - 1) * (len(stops) - 1); j = min(len(stops) - 2, int(f)); m = stops[j] + (stops[j + 1] - stops[j]) * (f - j)
        out.append(int(m[0]) << 16 | int(m[1]) << 8 | int(m[2]))
    return out

def poly_light(fill, sides, seg=5):
    """CARTRIDGE: lights a body part as a real low-poly 3D solid. The part's silhouette is treated as a loft along its
    long axis (found with PCA): slices `seg` px long, each an n-sided prism (`sides`) as wide as the part is there, with
    the slant of its taper. Every pixel gets the flat light of the polygon it sits on -> 0..1 per pixel."""
    ys, xs = np.nonzero(fill); v = np.zeros(fill.shape)
    if len(xs) < 4: return v
    P = np.stack([xs, ys], 1).astype(float); c = P.mean(0)
    w_, V = np.linalg.eigh(np.cov((P - c).T)); ax = V[:, 1]; pe = np.array([-ax[1], ax[0]])
    u = (P - c) @ ax; w = (P - c) @ pe
    sl = np.floor((u - u.min()) / seg).astype(int); ns = sl.max() + 1
    cen = np.zeros(ns); half = np.ones(ns)
    for i in range(ns):
        m = sl == i
        if m.any(): lo, hi = w[m].min(), w[m].max(); cen[i] = (lo + hi) / 2; half[i] = max(0.8, (hi - lo) / 2 + 0.5)
    step = 2 * math.pi / sides
    for k in range(len(xs)):
        i = sl[k]; t = max(-0.999, min(0.999, (w[k] - cen[i]) / half[i]))
        th = round(math.asin(t) / step) * step                       # which side of the prism this pixel is on
        dh = (half[min(ns - 1, i + 1)] - half[max(0, i - 1)]) / (2 * seg)
        tilt = -math.atan(dh)                                         # the taper slants the faces toward / away from the axis
        n2 = ax * math.sin(tilt) + pe * math.sin(th) * math.cos(tilt)
        n = np.array([n2[0], n2[1], math.cos(th) * math.cos(tilt)])
        v[ys[k], xs[k]] = min(1, 0.12 + 0.95 * max(0.0, float(n @ LIGHT)) + 0.05 * (i % 2))
    return v

def sphere_light(x, y, cx, cy, r, lat_n=4, lon_n=5):
    """CARTRIDGE's head: the light on a low-poly sphere (lat_n x lon_n faces) at pixel x, y."""
    dy = max(-0.999, min(0.999, (y - cy) / r)); lat = round(math.asin(dy) / (math.pi / lat_n)) * (math.pi / lat_n)
    cl = max(0.2, math.cos(math.asin(dy))); dx = max(-0.999, min(0.999, (x - cx) / (r * cl)))
    lon = round(math.asin(dx) / (math.pi / lon_n)) * (math.pi / lon_n)
    n = np.array([math.sin(lon) * math.cos(lat), math.sin(lat), math.cos(lon) * math.cos(lat)])
    return min(1, 0.12 + 0.95 * max(0.0, float(n @ LIGHT)))

def facet_id(x, y):
    """Which flat polygon (a triangle of a FACET-px grid, split along a diagonal) this pixel belongs to."""
    c = FACET; return (x // c, y // c, (x % c) > (y % c) if (x // c + y // c) % 2 else (x % c) + (y % c) >= c)

def sh(m, dy, dx):
    H, W = m.shape; o = np.zeros_like(m)
    o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return o

def outline(a):
    s = a[..., 3] > 0
    ring = ~s & (sh(s, 1, 0) | sh(s, -1, 0) | sh(s, 0, 1) | sh(s, 0, -1))
    a[ring] = hx(LINE); return a

def noise(x, y, seed=0):
    """Smooth-ish hash noise in 0..1 (no randomness between runs)."""
    v = math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
    return v - math.floor(v)

def blob(x, y, seed=0):
    """Low-frequency noise: the sludge's uneven edge."""
    return (noise(x // 3, y // 3, seed) * 0.6 + noise(x // 2, y // 2, seed + 9) * 0.4)

def sludged(x, y, stage, seed=0):
    """Is this pixel under sludge? It pours down from the top of her head, unevenly, in runs and drips."""
    c = COVER[stage]
    if c <= 0: return False
    if c >= 1: return True
    run = noise(x, 0, seed + 3)                      # some columns run further down (drips)
    reach = 4 + c * 60 + (run - 0.5) * 20 * c        # how far down from the top of the head it has run, in pixels
    return y + (blob(x, y, seed) - 0.5) * 10 < reach

def vpaint(x, y, ramp, v, stage, seed):
    """A drawn costume's own pattern on its clothes and skin (or None for the plain shade)."""
    k = min(3, int(v * 3.99))
    if VARIANT == 'cartridge':
        if ramp is SHIRT and (y + (x // 3) % 2) % 9 == 4: return [0xc89a08, 0xf0c81a, 0xffe848, 0xfff8a0][k]   # the yellow zig-zag band
        if ramp is PANTS and x % 7 == 3: return PANTS[max(0, k - 1)]                  # (a seam)
    if VARIANT == 'bride':
        if ramp in (SHIRT, PANTS) and (x * 3 + y * 5) % 7 == 0 and k >= 1: return SHIRT[min(3, k + 1)] if (x + y) % 2 else SHIRT[k - 1]   # lace
        if ramp is PANTS and y > 52 - (noise(x, 0, seed) * 6): return [0x5a544a, 0x7a7466, 0x9a9484, 0xb8b2a2][k]   # the hem, gone grey
    if VARIANT == 'ember':
        if ramp is SKIN and blob(x, y, seed + 60) > 0.72: return [0xff5a0a, 0xff8a1a, 0xffc040, 0xfff090][k]       # glowing cracks in the char
        if ramp is SHIRT and y % 8 == 0: return VARIANTS['ember']['stripe'][k]                                 # gold trim on the robe
        if ramp is SHIRT and noise(x, y, seed + 61) > 0.96: return 0xff7a1a                                     # ...and the odd ember
    if VARIANT == 'cinder':
        if ramp in (SHIRT, PANTS, SHOE) and (x + y * 2) % 6 == 0: return ramp[max(0, k - 1)]                 # the wraps: bound strips, slanting
        if ramp in (SHIRT, PANTS) and y > 34 and noise(x, y, seed + 62) > 0.97: return [0x2a2420, 0x3a322c, 0x4a4038, 0x5a5048][k]   # scorch marks
        if ramp in (SHIRT, PANTS) and noise(x, y, seed + 63) > 0.985: return 0xff8a2a                    # a smouldering spark in the cloth
        if ramp is SKIN and noise(x, y, seed + 64) > 0.8: return SKIN[max(0, k - 1)]                     # ash on her hands
    if VARIANT == 'heartwood':
        if ramp in (SHIRT, PANTS, SHOE) and blob(x, y, seed + 70) > 0.8 and noise(x, y, seed + 71) > 0.35: return AMBER[k]   # sap glowing in the cracks
        if ramp in (SHIRT, PANTS, SHOE) and (x + int(noise(x // 4, y // 6, seed + 72) * 3)) % 3 == 0: return ramp[max(0, k - 1)]   # bark grain, running down
        if ramp is SKIN and blob(x, y, seed + 73) > 0.66: return SHIRT[min(3, k)]                        # bark growing over her hands
    if VARIANT == 'forge':
        if ramp in (SHIRT, PANTS) and blob(x, y, seed + 74) > 0.78: return [0x0a0808, 0x141010, 0x1e1a18, 0x2a2420][k]   # soot
        if ramp in (SHIRT, PANTS) and noise(x, y, seed + 75) > 0.985: return 0xffa030                    # a spark burnt into the cloth
        if ramp is SKIN and noise(x // 2, y, seed + 76) > 0.86: return [0x6a3020, 0x8a4a34, 0xa8644a, 0xc88060][k]   # old burns up her forearms
        if ramp is PANTS and (x + y // 3) % 7 == 0: return PANTS[max(0, k - 1)]                          # (stitched leather)
    if VARIANT == 'keeper':
        if ramp is SHIRT and x % 7 == 3: return SHIRT[max(0, k - 1)]                                     # the oilskin's seams
        if ramp is SHIRT and noise(x, y, seed + 75) > 0.9 and k >= 2: return 0x8ad0c0                    # a wet sheen on the oilskin
        if ramp in (SHOE, PANTS) and y > 50 and noise(x, y, seed + 76) > 0.8: return [0x8a9490, 0xb0b8b4, 0xd0d8d4, 0xe8f0ec][k]   # salt crust, barnacles
    return None

def repaint(a, ramp, stage, seed):
    """One of AERO's body parts as THE DEVOTED's clothes, with the sludge over it."""
    a = a.copy(); s = a[..., 3] > 0
    line = s & np.all(a[..., :3] == hx(D.OUT)[:3], -1); fill = s & ~line
    lum = a[..., :3].astype(float).mean(-1) / 255
    if fill.any():
        lo, hi = np.percentile(lum[fill], 5), np.percentile(lum[fill], 95)
        v = np.clip((lum - lo) / max(1e-3, hi - lo), 0, 1)
    if VARIANT == 'cartridge' and fill.any() and not FLAT3D:  # CARTRIDGE: lit as a real low-poly 3D solid (poly_light)
        sides = 4 if (ramp is SHIRT and fill.sum() > 150) or ramp is SHOE else 5
        v = poly_light(s, sides, 4)
    for y, x in zip(*np.nonzero(fill)):
        tone = vpaint(x, y, ramp, v[y, x], stage, seed)
        if sludged(x, y, stage, seed):
            k = 3 if noise(x, y, seed + 5) > 0.93 else int(v[y, x] * 2.99)
            a[y, x] = hx(SLUDGE[k])
        elif VARIANT == 'murder' and ramp in (SHIRT, SKIN, PANTS) and bloody(x, y, seed, 0.5 if ramp is SHIRT else 0.2):
            a[y, x] = hx(BLOOD[min(3, int(v[y, x] * 3.99))])
        elif tone is not None:
            a[y, x] = hx(tone)
        else:
            if VARIANT == 'murder' and ramp is SHIRT: r = MURDER_SHIRT
            else: r = STRIPE if ramp is SHIRT and y % 4 == 1 else ramp          # (the shirt's stripes)
            a[y, x] = hx(r[min(len(r) - 1, int(v[y, x] * (len(r) - 0.01)))])
    a[line] = hx(LINE)
    if stage:                                                          # drips hanging off the sludge's lower edge
        H = a.shape[0]
        for x in range(64):
            col = [y for y in range(H) if a[y, x, 3] and np.all(a[y, x, :3] == hx(SLUDGE[0])[:3]) or (a[y, x, 3] and tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in SLUDGE])]
            if col and noise(x, 7, seed) < 0.18 * stage:
                y0 = max(col)
                for d in range(1, 2 + int(noise(x, 3, seed) * 3)):
                    if y0 + d < H and a[y0 + d, x, 3] == 0: a[y0 + d, x] = hx(SLUDGE[1])
    return outline(a) if stage else a

def head(stage):
    """Her head, facing right: messy dark hair, two dark eyes, and a smile that grows with every stage."""
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    d.ellipse([26, 6, 41, 22], fill=(255, 255, 255, 255))
    h = np.zeros((64, 64, 4), np.uint8); s = np.array(im)[..., 3] > 0
    yy, xx = np.mgrid[0:64, 0:64]
    for y, x in zip(*np.nonzero(s)):
        v = 1 - min(1, math.hypot(x - 37, y - 10) / 13)
        h[y, x] = hx(SKIN[min(3, int(v * 3.99))])
    # hair: long and straight - a fringe across her forehead, a lock over her front eye's brow, and a curtain down
    # the back of her head past her neck
    im2 = Image.new('RGBA', (64, 64)); d2 = ImageDraw.Draw(im2)
    d2.ellipse([25, 4, 42, 13], fill=(255, 255, 255, 255))                     # the crown (kept above her eyes)
    d2.rectangle([31, 11, 43, 14], fill=(0, 0, 0, 0))
    d2.polygon([(25, 9), (31, 9), (31, 26), (28, 28), (24, 25)], fill=(255, 255, 255, 255))   # down the back
    d2.polygon([(33, 8), (42, 8), (42, 10), (34, 10)], fill=(255, 255, 255, 255))   # the fringe, ending above her brows
    hm = np.array(im2)[..., 3] > 0
    for y, x in zip(*np.nonzero(hm)):
        k = 3 if (y < 8 and x > 30) else 2 if (x + y * 0) % 3 else 1     # light on top, strands down the back
        if x < 27 or y > 20: k = max(0, k - 1)
        h[y, x] = hx(HAIR[k])
    for x in range(25, 31):                                                  # the uneven ends
        if noise(x, 2, 7) < 0.5: h[27 + int(noise(x, 4, 7) * 2), x] = hx(HAIR[0])
    a = h
    # the sludge (from stage 1 on it pours down from her hair; DROWNED: all of her)
    hair = np.zeros((64, 64), bool)
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        if tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in HAIR]: hair[y, x] = True
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        if stage == 1:                    # SEMI: the top of her hair is soaked, and it runs down her hair and face in streaks
            on = (hair[y, x] and (y < 9 + noise(x, 0, 12) * 4 or noise(x, 1, 12) < 0.3)) or (x in (34, 37, 41) and y < 11 + noise(x, 0, 5) * 8)
        elif stage == 2:                  # TAKEN: all of her head but a patch of face round the eyes and the grin
            on = ((x - 37) / 5.5) ** 2 + ((y - 15) / 4.5) ** 2 > 1 + (noise(x, y, 3) - 0.5) * 0.5
        else: on = stage == 3
        if on: a[y, x] = hx(SLUDGE[3 if noise(x, y, 8) > 0.9 else 1 + int(noise(x, y, 9) * 1.99)])
    # the face: eyes, then the smile (drawn over the sludge - it never covers those)
    # eyes: big enough to read at game size - a white, a dark 2x2 iris looking forward (glowing sludge-violet the
    # further gone she is) with a bright glint, and a dark lash line on top. DROWNED: two staring white lights.
    iris = [0x14100e, 0x3a1450, 0x6a1a8a, 0xf4f0e8][stage]
    for x0 in (34, 38):
        a[11, x0:x0 + 3] = hx(0x0e0a0a)                                    # the lash line
        for y in (12, 13):
            a[y, x0] = hx(0xf4f0e8 if stage < 3 else 0x2a1a30)            # the white (DROWNED: dark round the light)
            a[y, x0 + 1] = hx(iris); a[y, x0 + 2] = hx(iris)
        a[12, x0 + 2] = hx(0xffffff if stage < 3 else 0xffffff)            # the glint
        if stage == 3: a[13, x0 + 1] = hx(0xc8c0ff)
    if stage >= 2:                                            # dark hollows under the eyes
        for x in range(34, 41):
            if a[14, x, 3] and stage < 3: a[14, x] = hx(0x6a4a44)
    smile = {0: [(36, 17), (37, 17), (38, 17)],
             1: [(35, 16), (36, 17), (37, 17), (38, 17), (39, 16)],
             2: [(33, 15), (34, 16), (35, 17), (36, 17), (37, 17), (38, 17), (39, 17), (40, 16)],
             3: [(31, 14), (32, 15), (33, 16), (34, 17), (35, 18), (36, 18), (37, 18), (38, 18), (39, 18), (40, 17), (41, 16)]}[stage]
    mouth = 0x3a1414 if stage < 3 else 0xffffff
    for x, y in smile: a[y, x] = hx(mouth)
    if stage >= 2:                                            # teeth: a row of white in the grin
        teeth = [(x, y - 1) for x, y in smile[1:-1]]
        for x, y in teeth: a[y, x] = hx(0xf8f4ec)
        if stage == 3:
            for x, y in smile[2:-2]: a[y + 1, x] = hx(0xd8d4cc)
    if VARIANT == 'murder': a = mask(a, stage)
    a = vhead(a, stage)
    a = outline(a)
    a[22, 31:36] = np.where(a[22, 31:36, 3:4] > 0, a[22, 31:36], hx(LINE))   # (neck shadow)
    return a

def vhead(a, stage):
    """A drawn costume's head: CARTRIDGE's flat polygons and painted eyes, HOLLOW BRIDE's veil and black tears, EMBER
    SAINT's fire hair, coal eyes and halo."""
    v = VARIANT
    if v == 'cartridge':
        ramps = [] if FLAT3D else [(r, {tuple(hx(c)[:3]) for c in r}) for r in (HAIR, SKIN, SLUDGE[:3])]
        for y, x in zip(*np.nonzero(a[..., 3] > 0)):                         # relit as a low-poly sphere (the skull) + ponytail
            col = tuple(a[y, x, :3]); r = next((R_ for R_, S_ in ramps if col in S_), None)
            if r is None: continue                                             # (eyes, mouth, glitch pixels keep their colour)
            if math.hypot(x - 36.5, y - 13) <= 10.5: L_ = sphere_light(x, y, 36.5, 13, 10.5)
            else: L_ = sphere_light(x, y, 27, 18 + (y - 18) * 0.2, 6, 3, 3)     # the ponytail: a fat low-poly tube
            a[y, x] = hx(r[min(len(r) - 1, int(L_ * (len(r) - 0.01)))])
        if stage < 3:
            for x0 in (35, 39):                                               # big texture-painted eyes: white, a black pupil, a glint
                for y in (11, 12, 13): a[y, x0] = hx(0xffffff); a[y, x0 + 1] = hx(0x101018)
                a[11, x0 + 1] = hx(0x2a6af0); a[12, x0] = hx(0xffffff); a[10, x0:x0 + 2] = hx(HAIR[0])
            for x, y in [(36, 17), (37, 17), (38, 17), (35, 16), (39, 16)]: a[y, x] = hx(0x7a1a1a)   # a wide cartoon grin
            a[15, 41] = hx(0xff8a8a)                                            # (a rosy cheek)
        else:
            for x0 in (35, 39):
                a[12, x0] = hx(0x20e8ff); a[12, x0 + 1] = hx(0xff3ad8); a[13, x0] = hx(0xffffff)   # glitching eyes
    elif v == 'bride':
        im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
        d.polygon([(27, 5), (31, 4), (30, 12), (29, 22), (28, 31), (24, 37), (20, 35), (22, 24), (24, 12)], fill=(255, 255, 255, 255))   # (from her crown, down her back)
        vm = np.array(im)[..., 3] > 0
        for y, x in zip(*np.nonzero(vm)):                                     # the veil: sheer lace, dithered over what's under it
            if (x + y) % 2 and a[y, x, 3]: continue
            if noise(x, y, 70) > 0.9 and y > 14: continue                      # (torn)
            a[y, x] = hx([0xb8b2a4, 0xd6d0c2, 0xf6f2e6][(x * 2 + y) % 3])
        for x, y in [(28, 5), (30, 4), (32, 4)]: a[y, x] = hx(0xffffff); a[y - 1, x] = hx(0xe8e0f0)   # a little comb of wax flowers holding it
        if stage < 3:
            for x0, n in ((35, 4 + stage), (39, 5 + stage)):                    # black tears running from both eyes
                for y in range(14, 14 + n):
                    if a[y, x0, 3]: a[y, x0] = hx(0x0a0810)
                a[13, x0 - 1] = hx(0x3a3448)                                       # (dark under the eyes)
    elif v == 'ember':
        if stage < 3:
            for y, x in zip(*np.nonzero(a[..., 3] > 0)):                      # fire licking up off the top of her hair
                if y < 12 and not a[y - 1, x, 3] and noise(x, 0, 80) > 0.25:
                    h = 1 + int(noise(x, 1, 80) * 4)
                    for d2 in range(1, h + 1):
                        if y - d2 > 2: a[y - d2, x] = hx([0xffe070, 0xff9a20, 0xe84a10, 0xa81808][min(3, d2 - 1)])
        for x0 in (34, 38):                                                    # eyes like coals
            a[12, x0:x0 + 3] = hx(0x2a0a04); a[13, x0:x0 + 3] = hx(0x2a0a04)
            a[12, x0 + 1] = hx(0xffd040); a[12, x0 + 2] = hx(0xfff8c0); a[13, x0 + 1] = hx(0xff7a1a); a[13, x0 + 2] = hx(0xffb040)
        for x in range(30, 43):                                                # the halo: a thin gold ring floating over her head
            dx = (x - 36) / 6.5
            if abs(dx) <= 1:
                y = 1 + (1 - math.sqrt(max(0, 1 - dx * dx))) * 0
                a[1, x] = hx(0xfff07a if abs(dx) < 0.6 else 0xf0c03a)
                if abs(dx) > 0.85: a[2, x] = hx(0xc8901a)
        a[0, 34:39] = hx(0xfff8c0)
    elif v == 'cinder':
        im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
        d.ellipse([23, 2, 44, 19], fill=(255, 255, 255, 255))                                     # the hood over her crown...
        d.polygon([(24, 10), (31, 12), (31, 23), (28, 26), (24, 24), (23, 17)], fill=(255, 255, 255, 255))   # ...falling to her shoulders
        d.ellipse([31, 8, 46, 23], fill=(0, 0, 0, 0))                                             # (the opening for her face)
        hm = np.array(im)[..., 3] > 0
        for y, x in zip(*np.nonzero(hm)):
            if stage == 3: continue                                                                # (DROWNED: burnt away)
            if stage >= 1 and a[y, x, 3] and tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in SLUDGE] and noise(x, y, 90) > 0.5: continue
            vv = 0.95 - 0.5 * min(1, math.hypot(x - 36, y - 5) / 16) - (0.25 if x < 26 else 0)
            k = min(3, int(vv * 3.99)); k = max(0, k - 1) if (x + 2 * y) % 7 == 0 else k            # (folds in the cloth)
            a[y, x] = hx(HOOD[k])
        for x in range(31, 45):                                                                   # the hood's ragged rim round her face
            for y in range(7, 23):
                if hm[y, x] and not hm[y, min(63, x + 1)] and noise(x, y, 91) > 0.6 and stage < 3: a[y, min(63, x + 1)] = hx(HOOD[0])
        # the mask: a curved plate of cracked ash-grey ceramic over her brow and eyes, two slits with embers behind them
        for y in range(8, 15):
            for x in range(32, 44):
                if ((x - 38) / 6.2) ** 2 + ((y - 11) / 3.8) ** 2 <= 1 and a[y, x, 3]:
                    vv = 1 - min(1, math.hypot(x - 40, y - 9) / 7)
                    a[y, x] = hx(ASH[min(3, int(vv * 3.99))])
        for x, y in [(41, 8), (40, 9), (41, 10), (40, 11), (41, 12), (37, 13), (36, 14)]:            # the crack through it
            if a[y, x, 3]: a[y, x] = hx(0x2a2624)
        glow = [(0xffd060, 0xff7a1a), (0xffe080, 0xff8a2a), (0xfff0b0, 0xffa040), (0xffffff, 0xffc060)][stage]
        for x0 in (34, 38):                                                                       # the eye slits: embers behind the mask
            a[11, x0:x0 + 3] = hx(0x140c08); a[12, x0:x0 + 3] = hx(0x140c08)
            a[11, x0 + 1] = hx(glow[1]); a[11, x0 + 2] = hx(glow[0]); a[12, x0 + 1] = hx(glow[1])
        if stage >= 2:                                                                            # (the glow seeps out of the crack)
            for x, y in [(40, 9), (41, 10)]: a[y, x] = hx(0xff7a1a)
    elif v == 'heartwood':
        # twigs growing up out of her crown of dead leaves, a leaf or two still on them
        for (x0, y0, x1, y1) in [(29, 6, 26, 1), (26, 2, 24, 0), (33, 5, 33, 0), (33, 2, 36, 0), (37, 6, 40, 2)]:
            for q in np.linspace(0, 1, 8):
                x, y = int(round(x0 + (x1 - x0) * q)), int(round(y0 + (y1 - y0) * q))
                if 0 <= y < 64: a[y, x] = hx(0x2a1a10 if q > 0.3 else 0x4a3220)
        for x, y, c in [(24, 1, 0xa86a2a), (36, 1, 0x7a4a1a), (40, 3, 0xd8a050)]: a[y, x] = hx(c); a[y, x + 1] = hx(c)
        for y, x in zip(*np.nonzero(a[..., 3] > 0)):                                              # bark creeping over the back of her face
            if x < 35 and 9 <= y <= 21 and tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in SKIN] and blob(x, y, 77) > 0.45:
                a[y, x] = hx([0x2a1a10, 0x4a3220, 0x6a4a30][(x + y) % 3])
        for x0 in (34, 38):                                                                       # eyes of glowing sap
            a[12, x0:x0 + 3] = hx(0x1a1008); a[13, x0:x0 + 3] = hx(0x1a1008)
            a[12, x0 + 1] = hx(AMBER[3]); a[12, x0 + 2] = hx(AMBER[2]); a[13, x0 + 1] = hx(AMBER[1])
        if stage < 3:                                                                             # her mouth is the tree's knot now, weeping sap
            for x, y in [(36, 17), (37, 17), (38, 17), (36, 18), (37, 18), (38, 18)]: a[y, x] = hx(0x0a0604)
            for y in range(19, 21 + stage): a[y, 37] = hx(AMBER[1])
    elif v == 'forge':
        for x in range(25, 43):                                                                   # a red head-cloth tied round her hair...
            for y in (7, 8):
                if a[y, x, 3]: a[y, x] = hx([0x6a0c0a, 0x9a1a12, 0xc82a1a][(x + y) % 3])
        for x, y in [(24, 9), (23, 10), (24, 11), (22, 12), (23, 13)]: a[y, x] = hx(0x9a1a12)       # ...its knot trailing down the back
        for cx_ in (33, 39):                                                                      # forge goggles pushed up on top of it
            for dx in range(-2, 3):
                for dy in range(-2, 2):
                    if dx * dx + dy * dy <= 4: a[5 + dy, cx_ + dx] = hx(IRON[2] if dx * dx + dy * dy >= 3 else (0xffa030 if dy < 0 else 0xc86a10))
            a[4, cx_ - 1] = hx(0xffe890)                                                          # (a glint on the glass)
        for x in range(35, 38): a[5, x] = hx(LEATHER[1])                                          # the strap between them
        for x, y in [(40, 15), (41, 14), (39, 16), (42, 16)]: a[y, x] = hx(0x3a2a24)               # soot smeared across her cheek
    elif v == 'keeper':
        # a wide oilskin rain hat: crown over her hair, a brim that comes down long over the back of her neck
        for y in range(3, 9):
            for x in range(28 - (8 - y) // 3, 43):
                if ((x - 35) / 8) ** 2 + ((y - 8) / 5.5) ** 2 <= 1: a[y, x] = hx([0x0e2a26, 0x1a4640, 0x2a6a5e, 0x4a9484][min(3, 3 - (y - 3) // 2 + (1 if x > 37 else 0))])
        for x in range(22, 46):                                                                   # the brim
            y = 9 if x > 26 else 9 + (27 - x) // 2
            a[y, x] = hx(0x1a4640); a[y + 1, x] = hx(0x0e2a26) if x < 30 else a[y + 1, x]
        for x in range(30, 41): a[8, x] = hx(BRASS[1]) if x % 3 == 0 else a[8, x]                # a band stitched with brass thread
        for x0 in (34, 38):                                                                       # eyes lit like the lamp
            a[12, x0:x0 + 3] = hx(0x1a1008); a[13, x0:x0 + 3] = hx(0x1a1008)
            a[12, x0 + 1] = hx(0xffe890); a[12, x0 + 2] = hx(0xffc040); a[13, x0 + 1] = hx(0xf09a20)
        for x, y in [(41, 15), (42, 16), (40, 17)]: a[y, x] = hx(0x8a6450)                         # (salt-wind lines on her cheek)
    return a

def mask(a, stage):
    """MAD MURDER's mask over her face: a pale smiling face (shut, happy eyes and a wide painted grin) splashed with
    blood, a crack running down through it, and in the crack one wild, bloodshot eye staring out."""
    im = Image.new('RGBA', (64, 64)); ImageDraw.Draw(im).ellipse([31, 7, 43, 21], fill=(255, 255, 255, 255))
    m = np.array(im)[..., 3] > 0
    for y, x in zip(*np.nonzero(m)):
        v = 1 - min(1, math.hypot(x - 39, y - 11) / 10)
        a[y, x] = hx(MASK[min(3, int(v * 3.99))])
        pass
    for x, y in [(42, 9), (43, 10), (42, 10), (34, 19), (35, 20), (41, 19), (32, 14)]:          # a few splashes of blood on it
        if m[y, x]: a[y, x] = hx(BLOOD[2])
    for x, y in [(33, 12), (34, 11), (35, 12)]: a[y, x] = hx(0x1a1418)                     # a shut, happy eye (^)
    smile = [(33, 16), (34, 17), (35, 18), (36, 18), (37, 18), (38, 18), (39, 18), (40, 17), (41, 16), (42, 15)]
    for x, y in smile: a[y, x] = hx(0x1a1418)                                            # the painted grin...
    for x, y in smile[2:-2]: a[y - 1, x] = hx(0x8e1a1e)                                  # ...its red lips
    crack = [(41, 7), (40, 8), (40, 9), (39, 10), (39, 11), (40, 12), (39, 13), (38, 14), (38, 15), (37, 16)]
    for x, y in crack: a[y, x] = hx(0x0e0c12)                                            # the crack
    # the eye in the crack: a dark hole torn round it, bloodshot white, a tiny pupil, red veins
    for x in range(37, 42):
        for y in range(9, 15): a[y, x] = hx(0x0e0c12)
    for x, y in [(38, 11), (40, 11), (38, 12), (40, 12), (39, 11), (39, 12), (39, 10), (39, 13)]: a[y, x] = hx(0xf8f0e8)
    a[11, 38] = hx(0xc83030); a[12, 40] = hx(0xc83030)
    a[11, 39] = hx(0x000000); a[12, 39] = hx(0x6a0c10)
    if stage >= 2: a[11, 40] = hx(0xff3030)                                              # (redder the further gone she is)
    for y in range(17, 20 + stage):                                                       # blood running off the chin
        if a[y, 36, 3]: a[y, 36] = hx(BLOOD[2])
    return a

def knife(a):
    a = _knife(a)
    bl = VARIANTS.get(VARIANT, {}).get('blade')
    if bl:                                                    # a drawn costume's blade: the steel in its own colours
        for y, x in zip(*np.nonzero(a[..., 3] > 0)):
            if x < 46 or y < 26: continue
            r, g, b = (int(c) for c in a[y, x, :3])
            if r > 150 and g > 150: a[y, x] = hx(bl[3] if r > 230 else bl[2])
            elif (r, g, b) in ((0x16, 0x16, 0x1c), (0x3a, 0x3a, 0x46)): a[y, x] = hx(bl[0] if r < 0x20 else bl[1])
        if VARIANT == 'bride':                               # a white ribbon tied through the finger ring
            for x, y in [(41, 21), (40, 22), (40, 23), (42, 22), (39, 24)]: a[y, x] = hx(0xf6f2e6)
    if VARIANT == 'murder':                                   # MAD MURDER: the blade's red
        for y, x in zip(*np.nonzero(a[..., 3] > 0)):
            r, g, b = a[y, x, :3]
            if r > 150 and g > 150 and noise(x, y, 50) > 0.35: a[y, x] = hx(BLOOD[3] if noise(x, y, 51) > 0.5 else BLOOD[2])
    return a

def _knife(a):
    """A karambit in her front fist: a black claw-curved blade hooking forward and down out of the bottom of her fist,
    a silver edge along its inside curve, the black grip in her hand and the finger ring sticking out behind it."""
    a = a.copy()
    for x, y in [(43, 26), (44, 26), (45, 26)]: a[y, x] = hx(0x16161c)        # the black grip, showing through her fingers
    for x, y in [(42, 19), (43, 18), (44, 18), (45, 19), (45, 20), (44, 21), (43, 21), (42, 20)]:   # the finger ring, over her fist
        a[y, x] = hx(0x4a4a56 if y < 20 else 0x16161c)
    for x, y in [(41, 19), (41, 20), (42, 17), (43, 17), (44, 17), (45, 17), (46, 19), (46, 20), (42, 21), (45, 21)]:
        if not a[y, x, 3]: a[y, x] = hx(LINE)
    for x, y in [(43, 22), (44, 22)]:
        if not a[y, x, 3]: a[y, x] = hx(0x16161c)
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    outer = [(46, 26), (49, 26), (52, 27), (54, 30), (55, 33), (54, 36), (52, 39)]           # the spine: a claw's curve
    inner = [(52, 36), (52, 33), (51, 31), (49, 29), (47, 29)]                               # the cutting edge, inside the curve
    d.polygon(outer + inner, fill=(255, 255, 255, 255))
    m = np.array(im)[..., 3] > 0
    for y, x in zip(*np.nonzero(m)):
        if a[y, x, 3] and x <= 46: continue                                                # (her fingers stay in front)
        spine = not m[y - 1, x] or not m[y, min(63, x + 1)]
        a[y, x] = hx(0x3a3a46 if spine else 0x16161c)                                      # black, with a dull sheen on the spine
    for x, y in [(48, 29), (49, 29), (50, 30), (51, 31), (51, 32), (52, 33), (51, 34), (52, 35), (52, 36), (52, 37)]:
        if m[y, x]: a[y, x] = hx(0xd8dce4)                                                 # the bright silver edge
    a[39, 52] = hx(0xf4f6fa)                                                                 # the point
    s = a[..., 3] > 0
    ring = ~s & (sh(s, 1, 0) | sh(s, -1, 0) | sh(s, 0, 1) | sh(s, 0, -1))
    ring[:, :46] = False; ring[:26, :] = False
    a[ring] = hx(LINE)
    return a

def wing(stage):
    """The scarf slot: a single giant demon wing (DROWNED), a strand of sludge (TAKEN / SEMI), nothing (DEFAULT)."""
    a = np.zeros((64, 64, 4), np.uint8)
    if stage == 3 and VARIANT in ('heartwood', 'forge', 'keeper'): return outline(lore_wing())
    if stage == 3:
        im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
        root = (29, 23)
        tips = [(2, 0), (0, 14), (3, 28), (10, 38)]                        # the bony fingers reach up and back
        d.polygon([root, (24, 4), (12, 0), tips[0], (5, 8), tips[1], (6, 22), tips[2], (13, 30), tips[3], (22, 33)], fill=(255, 255, 255, 255))
        m = np.array(im)[..., 3] > 0
        for y, x in zip(*np.nonzero(m)):
            W_ = VARIANTS.get(VARIANT, {}).get('wing')
            if W_ and VARIANT == 'bride' and noise(x, y, 71) > 0.84: continue                  # (a torn veil-wing: holes)
            a[y, x] = hx((W_[0] if noise(x, y, 2) > 0.2 else W_[1]) if W_ else (0x1a0e1e if noise(x, y, 2) > 0.2 else 0x2a1630))
        for t in tips + [(12, 0)]:                                          # the bones
            bi = Image.new('RGBA', (64, 64)); ImageDraw.Draw(bi).line([root, t], fill=(255, 255, 255, 255), width=1)
            W_ = VARIANTS.get(VARIANT, {}).get('wing')
            for y, x in zip(*np.nonzero(np.array(bi)[..., 3] > 0)): a[y, x] = hx(W_[2] if W_ else 0x4a3248)
        cl = VARIANTS.get(VARIANT, {}).get('wing', (0, 0, 0, 0xc8b8c0))[3]
        for t in tips: a[t[1], t[0]] = hx(cl)                          # claws at the tips
        for y in range(1, 4): a[y, 12] = hx(cl)
        # sludge running off the wing's lower edge
        for x in range(8, 28, 3):
            col = [y for y in range(64) if a[y, x, 3]]
            if col:
                for d2 in range(1, 3): a[max(col) + d2, x] = hx(SLUDGE[1])
        return outline(a)
    if stage >= 1:                                                         # a sludge strand down her back
        n = 4 + stage * 4
        for i in range(n):
            x, y = 28 - i // 3, 22 + i
            a[y, x] = hx(SLUDGE[1]); a[y, x - 1] = hx(SLUDGE[0])
        return outline(a)
    a[24, 29] = hx(SHIRT[1])                                               # (hidden behind her back)
    return a

def lore_wing():
    """DROWNED's wing for the three lore costumes: HEARTWOOD's great bare branch with dead leaves and sap running down
    it, FORGEBOUND's fan of hammered iron plates with molten seams, THE LAST KEEPER's mass of kelp tangled in torn net with sea foam on it."""
    a = np.zeros((64, 64, 4), np.uint8); root = (29, 23)
    def ln(p0, p1, c, w=1):
        im = Image.new('RGBA', (64, 64)); ImageDraw.Draw(im).line([p0, p1], fill=(255, 255, 255, 255), width=w)
        for y, x in zip(*np.nonzero(np.array(im)[..., 3] > 0)): a[y, x] = hx(c)
    if VARIANT == 'heartwood':
        for tip, w in [((4, 2), 3), ((0, 16), 3), ((6, 30), 2), ((16, 4), 2)]:
            ln(root, tip, 0x2a1a10, w); ln(root, tip, 0x4a3220, 1)
            mx_, my_ = (root[0] + tip[0]) // 2, (root[1] + tip[1]) // 2
            ln((mx_, my_), (mx_ - 6, my_ - 5), 0x2a1a10)                                              # side twigs
        for x, y, c in [(4, 3, 0xa86a2a), (1, 17, 0xd8a050), (6, 31, 0x7a4a1a), (16, 5, 0xa86a2a), (10, 9, 0xd8a050), (8, 22, 0xa86a2a)]:
            a[y, x] = hx(c); a[y + 1, x] = hx(c); a[y, x + 1] = hx(c)
        for x, y in [(18, 14), (14, 20), (22, 10)]:                                                   # sap running down it
            for d in range(3): a[y + d, x] = hx(AMBER[2 - min(2, d)])
    elif VARIANT == 'forge':
        for i in range(7):                                                                            # iron plates, fanned like feathers
            ang = math.radians(-165 + i * 19); L = 20 + (i % 3) * 4
            ex, ey = root[0] + math.cos(ang) * L, root[1] + math.sin(ang) * L
            im = Image.new('RGBA', (64, 64)); dd = ImageDraw.Draw(im)
            px, py = -math.sin(ang) * 3.2, math.cos(ang) * 3.2
            dd.polygon([(root[0] + px, root[1] + py), (root[0] - px, root[1] - py), (ex - px * 0.6, ey - py * 0.6), (ex + px, ey + py)], fill=(255, 255, 255, 255))
            m = np.array(im)[..., 3] > 0
            for y, x in zip(*np.nonzero(m)):
                edge = not (m[max(0, y - 1), x] and m[min(63, y + 1), x] and m[y, max(0, x - 1)] and m[y, min(63, x + 1)])
                a[y, x] = hx(0xff7a1a if edge and noise(x, y, 81) > 0.4 else IRON[1 + (x + y + i) % 2])   # molten seams round each plate
            for q in (0.4, 0.75): rx, ry = int(root[0] + math.cos(ang) * L * q), int(root[1] + math.sin(ang) * L * q); a[ry, rx] = hx(IRON[3])   # rivets
    elif VARIANT == 'keeper':
        for i in range(6):                                                                            # kelp, streaming up and back
            x, y = float(root[0]), float(root[1])
            for k in range(26):
                ang = math.radians(-150 + i * 14) + math.sin(k * 0.5 + i) * 0.35
                x += math.cos(ang); y += math.sin(ang)
                if 0 <= int(y) < 64 and 0 <= int(x) < 64:
                    a[int(y), int(x)] = hx([0x0e2a1a, 0x1a4a2a, 0x2a6a3a][(k + i) % 3])
                    if int(x) + 1 < 64: a[int(y), int(x) + 1] = hx(0x0e2a1a)
        for x in range(6, 26, 4):                                                                     # a torn net over them
            ln((x, 2), (x + 8, 26), 0x8a8a7a); ln((x + 8, 2), (x, 26), 0x6a6a5a)
        for x, y in [(8, 4), (14, 12), (5, 20), (20, 6)]: a[y, x] = hx(0xd8f0f0)                    # sea foam
    return a

def dress(P, stage):
    """A drawn costume's extra pieces on her body: HOLLOW BRIDE's bouquet of dead roses and the red rose at her breast,
    EMBER SAINT's gold rosary."""
    if VARIANT == 'bride':
        a = P['bfore']; ys, xs = np.nonzero(a[..., 3] > 0); cy = int(ys.max()) - 1; cx = int(xs[ys >= cy - 1].mean())   # (her back hand: the end of the forearm)
        for dx, dy in [(0, 3), (-1, 5), (1, 6), (0, 7)]: a[cy + dy, cx + dx] = hx(0x2a3a1a)                    # stems hanging below
        for i, (dx, dy) in enumerate([(-2, -1), (1, -2), (2, 1), (-1, 1), (0, -3), (-3, 1), (3, -1)]):          # the dead roses
            col = [0x3a0a14, 0x5a1420, 0x7a2030][i % 3]
            for ex, ey in [(0, 0), (1, 0), (0, 1), (1, 1)]: a[cy + dy + ey, cx + dx + ex] = hx(col)
            a[cy + dy, cx + dx] = hx(0x9a3040)
        for dx, dy in [(-3, 3), (3, 2), (-4, 0)]: a[cy + dy, cx + dx] = hx(0x3a4a20)                            # withered leaves
        P['bfore'] = outline(a)
        t = P['torso']; ys, xs = np.nonzero(t[..., 3] > 0)
        bot, l0, r0 = int(ys.max()), int(xs[ys >= ys.max() - 1].min()), int(xs[ys >= ys.max() - 1].max())
        for dy in range(-1, 11):                                                                             # the skirt: lace, flaring out to a torn hem
            w = 1 + dy * 0.45
            for x in range(int(l0 - w), int(r0 + w) + 1):
                y = bot + dy
                if y > 63 or (dy > 7 and noise(x, 9, 72) > 0.55): continue
                v_ = 0.75 - 0.5 * abs(x - (l0 + r0) / 2) / ((r0 - l0) / 2 + w) - dy * 0.03
                c = SHIRT[max(0, min(3, int(v_ * 3.99)))] if (x * 3 + y * 5) % 7 else SHIRT[3]
                if dy > 6: c = [0x5a544a, 0x7a7466, 0x9a9484][(x + dy) % 3]                                   # (grey, dragged hem)
                t[y, x] = hx(c)
        P['torso'] = t = outline(t)
        rx, ry = int(np.percentile(xs, 75)), int(np.percentile(ys, 30))
        for dx, dy, c in [(0, 0, 0xc8202a), (1, 0, 0xa81420), (0, 1, 0x8a1018), (1, 1, 0xe83a3a), (-1, 1, 0x2a4a1a)]: t[ry + dy, rx + dx] = hx(c)
    if VARIANT == 'ember':
        t = P['torso']; ys, xs = np.nonzero(t[..., 3] > 0)
        x0, x1, y0, y1 = xs.min() + 2, xs.max() - 2, ys.min() + 3, ys.max() - 4
        for i in range(0, 12):                                                                               # a rosary across her chest
            x = int(x0 + (x1 - x0) * i / 11); y = int(y0 + (y1 - y0) * (i / 11) ** 1.2)
            if t[y, x, 3]: t[y, x] = hx(0xf0c03a if i % 2 else 0xfff07a)
        x, y = x1, y1
        for dy in range(0, 4): t[min(63, y + dy), x] = hx(0xf0c03a)
        t[min(63, y + 1), x - 1] = hx(0xf0c03a); t[min(63, y + 1), x + 1] = hx(0xf0c03a)                        # its little cross
    if VARIANT == 'cinder':
        t = P['torso']; ys, xs = np.nonzero(t[..., 3] > 0)
        bot, l0, r0 = int(ys.max()), int(xs[ys >= ys.max() - 1].min()), int(xs[ys >= ys.max() - 1].max())
        for x in range(l0, r0 + 1):                                                                          # a cord belt round her waist
            if t[bot - 2, x, 3] and not np.all(t[bot - 2, x, :3] == hx(LINE)[:3]): t[bot - 2, x] = hx(0x3a2a1a if x % 2 else 0x5a4028)
        for dy in range(0, 8):                                                                               # the ragged ends of her sash, hanging
            for dx in (0, 1):
                y, x = bot - 1 + dy, l0 + 1 + dx - dy // 3
                if y < 64 and noise(x, y, 93) < 0.85 - dy * 0.06: t[y, x] = hx(HOOD[2 - dx] if dy < 6 else HOOD[0])
        P['torso'] = outline(t)

def lore_dress(P, stage):
    """The three lore costumes' extra pieces on her body (after dress()): HEARTWOOD's branches rising from her
    shoulders with dead leaves and a vine round her waist; FORGEBOUND's leather apron, belt and the hammer at her
    hip; THE LAST KEEPER's brass buttons, the coil of rope over her shoulder and the brass lantern
    glowing at her hip."""
    if VARIANT not in ('heartwood', 'forge', 'keeper'): return
    t = P['torso']; ys, xs = np.nonzero(t[..., 3] > 0)
    top, bot = int(ys.min()), int(ys.max())
    row = lambda y: (int(xs[ys == y].min()), int(xs[ys == y].max())) if (ys == y).any() else (int(xs.min()), int(xs.max()))
    l0, r0 = row(top + 2); lb, rb = row(bot - 1); mid = (lb + rb) // 2
    sl = lambda x, y: tuple(int(v) for v in t[y, x, :3]) in [tuple(int(c) for c in hx(q)[:3]) for q in SLUDGE]
    put = lambda x, y, c: (0 <= x < 64 and 0 <= y < 64) and t.__setitem__((y, x), hx(c))
    if VARIANT == 'heartwood':
        if stage < 3:
            for (x0, y0, x1, y1) in [(l0 + 1, top + 4, l0 - 9, top - 6), (l0 - 5, top - 1, l0 - 12, top - 1), (l0 - 4, top - 2, l0 - 8, top - 12), (l0 - 7, top - 8, l0 - 4, top - 15)]:
                for q in np.linspace(0, 1, 12):                                                      # branches rising out of her back
                    put(int(round(x0 + (x1 - x0) * q)), int(round(y0 + (y1 - y0) * q)), 0x2a1a10 if q > 0.4 else 0x4a3220)
            for x, y, c in [(l0 - 10, top - 7, 0xa86a2a), (l0 - 13, top - 2, 0x7a4a1a), (l0 - 5, top - 16, 0xd8a050), (l0 - 9, top - 13, 0xa86a2a)]:
                put(x, y, c); put(x + 1, y, c); put(x, y + 1, c)                                      # dead leaves still hanging on
        for x in range(lb, rb + 1):                                                                   # a vine wound round her waist
            y = bot - 3 + (1 if (x // 2) % 2 else 0)
            if t[y, x, 3] and not sl(x, y): put(x, y, 0x3a5a1a if x % 3 else 0x5a7a2a)
    elif VARIANT == 'forge':
        for y in range(top + 2, bot + 1):                                                             # the heavy leather apron over her front
            for x in range(mid - 1, rb + 1):
                if t[y, x, 3] and not sl(x, y): put(x, y, LEATHER[1 + (1 if x > mid + 2 else 0)] if (x + y) % 9 else LEATHER[0])
        for q in np.linspace(0, 1, 10):                                                               # its strap over her shoulder
            x, y = int(round(mid + 1 + (l0 + 1 - mid - 1) * q)), int(round(top + 2 - 2 * q))
            if 0 <= y < 64 and t[y, x, 3]: put(x, y, LEATHER[0])
        for x in range(lb, rb + 1): put(x, bot - 4, LEATHER[0]) if t[bot - 4, x, 3] else None        # a belt
        hx0, hy0 = lb - 1, bot - 3                                                                    # the hammer hanging at her hip
        for y in range(hy0, hy0 + 7): put(hx0, y, 0x5a3a20)
        for x in range(hx0 - 2, hx0 + 3): put(x, hy0 + 7, IRON[2]); put(x, hy0 + 8, IRON[1])
        put(hx0 + 2, hy0 + 7, IRON[3])
    elif VARIANT == 'keeper':
        for i, y in enumerate(range(top + 3, bot - 1, 3)):                                            # brass buttons down the front
            if t[y, mid + 2, 3] and not sl(mid + 2, y): put(mid + 2, y, BRASS[2]); put(mid + 2, y + 1, BRASS[0])
        for q in np.linspace(0, 1, 18):                                                               # a coil of rope over her shoulder
            x, y = int(round(l0 + (rb - l0) * q)), int(round(top + 1 + (bot - 3 - top) * q))
            if t[y, x, 3] and not sl(x, y): put(x, y, 0x8a6a3a if int(q * 18) % 2 else 0x6a4a24)
        lx, ly = lb - 3, bot - 4                                                                      # the brass lantern at her hip
        for y in range(ly, ly + 8):
            for x in range(lx - 2, lx + 3):
                edge = x in (lx - 2, lx + 2) or y in (ly, ly + 7)
                put(x, y, BRASS[1] if edge else ([0xffe890, 0xffc040, 0xf09a20][(y - ly) % 3] if stage < 3 else 0x3a2a10))
        put(lx, ly - 1, BRASS[2]); put(lx, ly - 2, BRASS[1]); put(lx - 1, ly - 2, BRASS[1]); put(lx + 1, ly - 2, BRASS[1])   # its handle
        if stage < 3:
            for x, y in [(lx - 3, ly + 3), (lx + 3, ly + 3), (lx, ly + 8)]: put(x, y, 0xffd860)        # (light spilling out)
    P['torso'] = outline(t)

MARKS = {}     # her_legs' details that keep their own colour through `repaint` (laces, the skin through the rips)

def her_legs():
    """Her own legs (legs_kit, on AERO's leg joints), drawn in greys for `repaint` to colour: skinny jeans slashed
    open at the knees, and knee-high lace-up combat boots (the shin part is all boot - KIND gives it the SHOE ramp),
    criss-crossed laces, a buckle strap at the top, a deep lugged sole. Returns the six leg parts."""
    import nu_draw as N
    G = (0xb0b0b0, 0x808080, 0x505050); out = {}; MARKS.clear()
    for side, hip, knee, ank in (('b', (28, 40), (24, 48), (24, 55)), ('f', (37, 40), (41, 48), (41, 55))):
        im = N.blank(); d = ImageDraw.Draw(im); LK.seg(d, hip, knee, 6, 4.5, N.hx(G[1]), bulge=0.7, at=0.3)
        a = D.finish(im, G)
        for (x, y) in LK.along(hip, knee, 0, 0.48, 0.75, 1): a[y, x] = hx(0x202020)          # the slash above the knee
        MARKS[side + 'thigh'] = [(x, y, 'rip') for (x, y) in LK.along(hip, knee, 0.8, 0.5, 0.72, 1) + LK.along(hip, knee, -0.6, 0.55, 0.7, 1)]
        out[side + 'thigh'] = a
        im = N.blank(); d = ImageDraw.Draw(im); LK.seg(d, knee, (ank[0], ank[1] - 1), 5, 4.5, N.hx(G[1]), bulge=0.8, at=0.3)
        a = D.finish(im, G)
        for y in range(knee[1] + 2, ank[1] - 1):                                             # the laces, criss-crossed
            x = ank[0] + (knee[0] - ank[0]) * (ank[1] - y) / (ank[1] - knee[1]) + 1
            for dx in (-1, 0, 1):
                xx = int(round(x + dx * (1 if y % 2 else -1)))
                if dx and y % 2 == 0: continue                                                         # (an X every other row)
                if a[y, xx, 3] and not np.all(a[y, xx, :3] == hx(D.OUT)[:3]): a[y, xx] = hx(0xe8e8e8); MARKS.setdefault(side + 'shin', []).append((xx, y, 'lace'))
        for (x, y) in LK.along(knee, ank, 0, 0.05, 0.2, 1): a[y, x] = hx(0x303030)              # the strap at the top...
        tx, ty = LK.along(knee, ank, -1.5, 0.12, 0.12)[0]
        if a[ty, tx, 3]: a[ty, tx] = hx(0xffffff)                                                 # ...and its buckle
        out[side + 'shin'] = a
        im = N.blank(); d = ImageDraw.Draw(im); LK.shoe(d, ank, N.hx(G[1]), 'boot', length=8, top=ank[1] - 1)
        a = D.finish(im, G)
        for x in range(ank[0] - 4, ank[0] + 9): a[58, x] = hx(D.OUT) if x % 2 else hx(0x303030)   # the lugged sole
        for x in range(ank[0] - 3, ank[0] + 8): a[57, x] = hx(0x404040) if a[57, x, 3] else a[57, x]
        a[55, ank[0] + 5] = hx(0xe8e8e8)                                                           # the toe cap's scuff
        out[side + 'shoe'] = a
    return out

def draw_parts(stage):
    base = D.draw_parts()
    base.update(her_legs())
    P = {}
    for n, l in base.items():
        if n in ('head', 'fish', 'scarf'): continue
        P[n] = repaint(l, KIND.get(n, SHIRT), stage, hash(n) % 97)
        for (x, y, kind) in MARKS.get(n, ()):                       # laces and torn knees, unless the sludge has them
            px = tuple(int(v) for v in P[n][y, x, :3])
            if not P[n][y, x, 3] or px in [tuple(int(v) for v in hx(c)[:3]) for c in SLUDGE] or px == tuple(int(v) for v in hx(LINE)[:3]): continue
            P[n][y, x] = hx(SKIN[2] if kind == 'rip' else (SHIRT[3] if VARIANT in ('bride', 'cinder') else 0xd8cfb8))
    P['ffist'] = knife(P['ffist'])
    dress(P, stage); lore_dress(P, stage)
    P['head'] = head(stage)
    f = np.zeros((64, 64, 4), np.uint8); f[16, 33] = P['head'][16, 33] if P['head'][16, 33, 3] else hx(SKIN[2])   # (the goldfish slot: a still pixel of her cheek)
    P['fish'] = f
    P['scarf'] = wing(stage)
    return P

ORDER = D.ORDER
# AERO's moves without FULL AERO's spear moves (k_*, upb_king) - she never uses them, and they'd push the moves
# sheet past the 4096 px phones can load. Its own frame table: src/fighters/dvMoves.js
MOVES = {k: v for k, v in A.MOVES.items() if not k.startswith('k_') and k != 'upb_king'}
JS = os.path.join(ROOT, 'src/fighters/dvMoves.js')

# WORSHIP (her PRAY, down special - replaces AERO's downB): she drops to one knee, raises the karambit high over her
# head, then drives it down into the ground in front of her and holds it there, head bowed,
# before getting up. The stab lands on frame 22 (the sludge rises from there; an answered prayer takes her up at 32).
P, k, mix = A.P, A.k, A.mix
KNEEL = P(root=(0, 2, 0, 1.0, 0.84), torso=(6, 0, 1), head=(10, 0, 1),
          bthigh=(64, 0, 0), bshin=(-120, 0, 0), bshoe=(56, 0, 0), fthigh=(-62, 0, 0), fshin=(62, 0, 0), fshoe=(0, 0, 0),
          fupper=(20, 0, 0), ffore=(-40, 0, 0), bupper=(20, 0, 0), bfore=(-30, 0, 0))
RAISE = mix(KNEEL, torso=(-6, 0, 0), head=(-4, 0, 0), fupper=(-142, 0, -2), ffore=(-36, 0, 0), bupper=(10, 0, 0), bfore=(-50, 0, 0))
STAB = mix(KNEEL, root=(0, 3, 2, 1.0, 0.82), torso=(18, 1, 2), head=(22, 0, 2), fupper=(48, 0, 1), ffore=(36, 0, 0), bupper=(4, 0, 0), bfore=(-40, 0, 0))
# OFFERING (neutral special): draws the karambit across her open palm, then flings the sludge that pours out of it
CUT = P(torso=(8, 0, 1), head=(14, 0, 1), fupper=(-30, 0, 0), ffore=(-100, 0, 0), bupper=(-50, 0, 0), bfore=(-60, 0, 0), **A.legs(12, -6, -14, 10))
FLING = P(torso=(-10, 1, -1), head=(-8, 0, 0), fupper=(30, 0, 0), ffore=(-30, 0, 0), bupper=(-120, 0, -1), bfore=(-20, 0, 0), root=(0, 2, -1, 0.96, 1.04), **A.legs(20, -2, -24, 14))
MOVES['neutralB'] = (32, [k(0, P()), k(7, CUT, 'out'), k(11, mix(CUT, ffore=(-70, 0, 0)), 'snap'), k(14, FLING, 'snap'), k(22, mix(FLING, bupper=(-100, 0, -1)), 'out'), k(32, P(), 'back')], 1, ('bfore',), False, None)
# REAPING HOOK (side special): a low lunge, the karambit swung round in a hooking arc that drags them past her
COIL = P(torso=(22, 0, 2), head=(18, 0, 2), fupper=(50, 0, 0), ffore=(-40, 0, 0), bupper=(10, 0, 0), bfore=(-50, 0, 0), root=(0, -2, 0, 1.06, 0.9), **A.legs(30, -40, -30, 40))
REACH = P(torso=(30, 2, 3), head=(20, 0, 2), fupper=(-80, 0, -1), ffore=(-10, 0, 0), bupper=(40, 0, 0), bfore=(-30, 0, 0), root=(0, 4, 2, 1.06, 0.9), **A.legs(36, -20, -44, 30))
HOOK = mix(REACH, fupper=(-10, 0, 0), ffore=(-90, 0, 0), torso=(16, 0, 1))
MOVES['sideB'] = (34, [k(0, P()), k(4, COIL, 'out'), k(8, REACH, 'snap'), k(13, HOOK, 'snap'), k(24, mix(HOOK, torso=(10, 0, 1)), 'out'), k(34, P(), 'back')], 1, ('ffore', 'ffist'), False, None)
# SLUDGE GEYSER (up special): stabs straight down at her own feet - the geyser of sludge throws her up, karambit high
DOWNSTAB = P(torso=(20, 0, 2), head=(24, 0, 2), fupper=(40, 0, 0), ffore=(40, 0, 0), bupper=(20, 0, 0), bfore=(-20, 0, 0), **A.DEEP)
UPTHRUST = P(torso=(-10, 0, -1), head=(-14, 0, 0), fupper=(-165, 0, -2), ffore=(-10, 0, 0), bupper=(-30, 0, 0), bfore=(-40, 0, 0), root=(0, 0, -3, 0.9, 1.12), **A.legs(-10, 30, -20, 40, -10, -10))
MOVES['upb'] = (40, [k(0, P()), k(6, DOWNSTAB, 'out'), k(10, UPTHRUST, 'snap'), k(28, mix(UPTHRUST, fupper=(-150, 0, -2)), 'linear'), k(40, mix(UPTHRUST, **A.legs(-20, 50, -30, 60)), 'out')], 1, ('ffore', 'ffist'), False, None)
MOVES['downB'] = (54, [k(0, P()), k(8, KNEEL, 'out'), k(16, RAISE, 'inout'), k(22, STAB, 'snap'),
                       k(30, mix(STAB, torso=(30, 1, 2)), 'linear'), k(44, mix(STAB, head=(36, 0, 2)), 'linear'), k(54, P(), 'back')],
                  1, (), False, None)
# THE BOOK (her demon wheel, state demonpick): she holds a shadow-sludge spellbook open in front of her in both
# hands (the game draws the book and its turning pages at her hands - fighterDevoted.drawSpellbook), head bowed
# over it, the front hand flicking a page over every 12 ticks. Loops.
BOOK = P(torso=(8, 0, 1), head=(22, 0, 1), fupper=(-38, 0, 0), ffore=(-74, 0, 0), ffist=(20, 0, 0), bupper=(-30, 0, 0), bfore=(-92, 0, 0), **A.legs(6, -6, -8, 10))
FLICK = A.mix(BOOK, fupper=(-50, 0, 0), ffore=(-96, 0, 0), head=(18, 0, 1))
MOVES['demonpick'] = (48, [k(0, BOOK), k(6, FLICK, 'out'), k(12, BOOK, 'in'), k(18, A.mix(BOOK, head=(26, 0, 1)), 'inout'), k(24, BOOK, 'inout'),
                           k(30, FLICK, 'out'), k(36, BOOK, 'in'), k(42, A.mix(BOOK, head=(18, 0, 1)), 'inout'), k(48, BOOK, 'inout')], 4, (), True, None)
FOLLOW = dict(A.FOLLOW, fish=(0, 0), scarf=(0.5, 1.0))

def idle_keys():
    """Her own idle - ON THE HUNT, standing tall: straight back, chin up, legs nearly straight in an easy stance, the
    karambit held low and ready at her side, chest rising and falling, weight rolling from foot to foot. She flips the
    karambit round her finger twice, raises it beside her chin, then rolls her neck (left, right) and lowers it again.
    192 ticks, keyed every 6, every part always moving a little so it never sits still."""
    def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
    def lerp(a, b, q): return a + (b - a) * q
    READY = dict(fu=-14, ff=-38, fx=-30, bu=12, bf=-22, tor=1, head=-3)    # upright, blade low and forward, back hand loose
    CHIN = dict(fu=-80, ff=-100, fx=60, bu=6, bf=-30, tor=3, head=4)      # the blade up beside her face, eyes over it
    SPIN = dict(fu=-24, ff=-20, fx=-30, bu=12, bf=-22, tor=1, head=2)     # forearm out a little, watching the blade flip
    keys = []
    for i in range(0, 193, 6):
        br = math.sin(i * math.pi / 24)                                      # breathing: four breaths a loop
        sh = math.sin(i * math.pi / 48)                                      # weight rolling foot to foot: two shifts a loop
        spin = ease((i - 60) / 36) if 60 <= i <= 96 else (1.0 if i > 96 else 0.0)
        chin = ease((i - 90) / 18) * (1 - ease((i - 150) / 24))              # up to the chin after the spin, back down at the end
        roll = math.sin((i - 126) / 42 * 2 * math.pi) if 126 <= i <= 168 else 0   # the neck roll: one way, then the other
        sp = math.sin(spin * math.pi) if i <= 96 else 0
        c = {n: lerp(lerp(READY[n], SPIN[n], sp), CHIN[n], chin) for n in READY}
        flip = -720 * spin if i <= 96 else -720                               # two full flips of the karambit round her finger
        keys.append(k(i, P(root=(0, round(0.6 * sh), round(0.4 + 0.4 * br), 1.0, 1.0),
                           torso=(c['tor'] + 1.5 * br, 0, 0), head=(c['head'] - br + 12 * roll, 0, round(roll)),
                           fupper=(c['fu'] + 3 * br, 0, 0), ffore=(c['ff'] + 3 * sh, 0, 0), ffist=(c['fx'] + flip, 0, 0),
                           bupper=(c['bu'] - 3 * br, 0, 0), bfore=(c['bf'] + 4 * sh, 0, 0),
                           **A.legs(6 + 2 * sh, -3 - br, -8 + 2 * sh, 6 + br, 1, -3)), 'linear'))
    return keys

def drowned_idle_keys():
    """DROWNED's idle: she floats - legs dangling, toes pointed down, arms hanging limp and swaying, head hung, bobbing
    slowly in the air; now and then her head jerks up to look, then sinks again. 192 ticks."""
    keys = []
    for i in range(0, 193, 6):
        ph = i * math.pi / 48
        bob = math.sin(ph)                                         # two slow bobs a loop
        look = 1.0 if 120 <= i <= 150 else 0.0
        keys.append(k(i, P(root=(0, 0, round(-2 * bob), 1.0, 1.0), torso=(12 + 3 * bob, 0, 1), head=(22 - 30 * look + 4 * bob, 0, 1),
                           fupper=(14 + 8 * math.sin(ph + 0.6), 0, 0), ffore=(-12 + 6 * math.sin(ph + 1.2), 0, 0),
                           bupper=(8 + 8 * math.sin(ph + 2.0), 0, 0), bfore=(-8 + 6 * math.sin(ph + 2.6), 0, 0),
                           **A.legs(14 + 4 * bob, 22, -4 + 4 * bob, 30, 46, 40)), 'linear'))
    return keys

def drowned_glide_keys():
    """DROWNED's walk: she doesn't walk, she glides - leaning in, head up and staring ahead, arms and legs trailing
    behind her and rippling like something underwater. 48 ticks."""
    keys = []
    for i in range(0, 49, 6):
        ph = i * math.pi / 24
        w = math.sin(ph)
        keys.append(k(i, P(root=(0, 0, round(-1.5 * math.sin(ph * 2)), 1.0, 1.0), torso=(26 + 2 * w, 1, 1), head=(-10, 0, 0),
                           fupper=(56 + 10 * w, 0, 0), ffore=(-24 + 8 * w, 0, 0), bupper=(66 - 10 * w, 0, 0), bfore=(-18 - 8 * w, 0, 0),
                           **A.legs(34 + 8 * w, 30 - 10 * w, 26 - 8 * w, 36 + 10 * w, 50, 46)), 'linear'))
    return keys

# how much of the rig's whole-body squash & stretch she keeps (AERO's poses squash him up to ~8% - on her chunky boots
# and short frame that read as stretched legs, so she keeps only a little of it)
SQUASH = 0.2

def unstretch(pose):
    """The pose with its whole-body squash / stretch (root sx, sy) cut down to SQUASH of itself."""
    if 'root' not in pose: return pose
    r = list(A.N.full(pose['root'])) if hasattr(A.N, 'full') else list(pose['root'])
    r = (r + [0, 0, 0, 1, 1][len(r):])[:5]
    r[3] = 1 + (r[3] - 1) * SQUASH; r[4] = 1 + (r[4] - 1) * SQUASH
    return {**pose, 'root': tuple(r)}

# how far her legs swing in the run, against AERO's (his long stride splayed her short legs)
STRIDE = 0.8

def her_run_keys():
    """AERO's run, without the squash that stretched her legs, and a shorter stride (STRIDE)."""
    def short(p):
        legs_ = {n: (v[0] * STRIDE,) + tuple(v[1:]) for n, v in p.items() if n in ('bthigh', 'bshin', 'fthigh', 'fshin')}
        return {**p, **legs_}
    return [(t, unstretch(short(p)), e) for (t, p, e) in A.N.run_keys()]

def make_life(stage):
    """AERO's breathing, minus the goldfish; DROWNED's wing beats slowly and heavily. Squash & stretch cut down (SQUASH)."""
    def life(pose, t):
        p = unstretch(A.life(pose, t))
        p['fish'] = (0, 0, 0, 1, 1)
        sc = A.N.full(p.get('scarf'))
        if stage == 3: sc[0] += -8 * math.sin(t * 0.09) - 2 * math.sin(t * 0.21)
        else: sc[0] *= 0.3
        p['scarf'] = tuple(sc)
        return p
    return life

def composite(layers, hide=()):
    out = np.zeros((64, 64, 4), np.uint8)
    for n in ORDER:
        if n in hide: continue
        a = layers[n]; m = a[..., 3] > 0; out[m] = a[m]
    return out

if __name__ == '__main__':
    if '--set' in sys.argv:                                          # a costume's look: --set murder
        i = sys.argv.index('--set'); apply_variant(sys.argv[i + 1]); del sys.argv[i:i + 2]
    if '--move' in sys.argv:                                         # a contact sheet of one move: --move NAME FILE
        sys.argv[sys.argv.index('--move'):sys.argv.index('--move') + 1] = []
    if '--pray' in sys.argv or len(sys.argv) == 3:
        layers = draw_parts(0)
        look = types.SimpleNamespace(draw_parts=lambda L=layers: {n: a.copy() for n, a in L.items()}, composite=composite, ORDER=ORDER, RIG=D.RIG)
        small, big = A.N.build_rig(look, FOLLOW)
        name = sys.argv[1] if len(sys.argv) == 3 else 'downB'
        t, keys, step, smear, loop, center = MOVES[name]
        fr = A.N.animate(big, keys, t, step=step, smear=smear, center=center, life=make_life(0))
        pick = fr[::4]
        sheet = Image.new('RGBA', (112 * len(pick), 104), (120, 150, 190, 255))
        for i, f in enumerate(pick): sheet.alpha_composite(Image.fromarray(f), (i * 112, 0))
        sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(sys.argv[-1]); sys.exit()
    if '--preview' in sys.argv:
        row = Image.new('RGBA', (64 * 4, 64), (120, 150, 190, 255))
        for i in range(4): row.alpha_composite(Image.fromarray(composite(draw_parts(i))), (i * 64, 0))
        row.resize((row.width * 6, row.height * 6), Image.NEAREST).save(sys.argv[sys.argv.index('--preview') + 1]); sys.exit()
    for i, name in enumerate(STAGES):
        layers = draw_parts(i)
        look = types.SimpleNamespace(draw_parts=lambda L=layers: {n: a.copy() for n, a in L.items()}, composite=composite, ORDER=ORDER, RIG=D.RIG)
        small, big = A.N.build_rig(look, FOLLOW)
        root = os.path.join(OUT, VARIANT) if VARIANT else OUT
        out = root if i == 0 else os.path.join(root, name)
        os.makedirs(out, exist_ok=True)
        A.N.build_all(small, big, MOVES, out, JS if i == 0 and not VARIANT else os.devnull, 'DV_MOVES', 'devoted_draw.py', life_fn=make_life(i), idle=drowned_idle_keys if i == 3 else idle_keys, run=drowned_glide_keys if i == 3 else her_run_keys)
        if i:
            p = os.path.join(out, 'icon.png')
            if os.path.exists(p): os.remove(p)
        print(name, 'built')
