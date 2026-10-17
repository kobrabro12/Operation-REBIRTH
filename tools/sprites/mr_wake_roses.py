"""Mr Wake's ROSEBUD costume: his cloak and hat overgrown with leafy vines and red roses, and his
staff turned into a giant tulip.
Run:  python3 tools/sprites/mr_wake_roses.py tools/sprites/mr_wake_idle.svg public/assets/fighters/mr-wake/roses/idle_sheet.png

Built from the same 64x64 SVG as his normal sprite and animated by mr_wake.py, so it breathes and
sways exactly like the original:
  - the maroon cloak and hat become dark rose-bush green, dotted with roses (red, with a darker
    spiral and a bright lip), each with a leaf or two; a big rose sits on his hat brim
  - the staff becomes a green stem with two long leaves, ending in a big pink-red tulip where the
    gem was
  - the purple energy around the gem becomes loose petals and pollen drifting around the tulip
"""
import importlib.util, os, sys

spec = importlib.util.spec_from_file_location('mr_wake', os.path.join(os.path.dirname(__file__), 'mr_wake.py'))
mw = importlib.util.module_from_spec(spec); sys.argv, argv = [sys.argv[0]], sys.argv; spec.loader.exec_module(mw); sys.argv = argv

px = mw.load_svg(sys.argv[1])

# ---- palette (new colour codes)
STEM_D, STEM_M, STEM_L = '1E4A1E', '2F7A2C', '58B048'
LEAF_D, LEAF_M, LEAF_L = '1F5524', '3C8C38', '7CCB5C'
T_O, T_D, T_M, T_L, T_H = '4A0820', '9A1240', 'D6336C', 'FF7AA8', 'FFC8DA'     # tulip
R_O, R_D, R_M, R_L = '3A0410', '8A0E26', 'C8283C', 'FF6A72'                    # roses
CLOAK = {'651B3A': '2E5A2A', '3D041C': '1D3D1E', '23020C': '10261A'}          # maroon cloak -> rose-bush green

# ---- 1. the staff becomes a stem: clear the gem head, recolour the shaft
STAFF = {'2C2828': STEM_D, '545150': STEM_L, '33293C': STEM_M, '443D4A': STEM_M}
for (x, y), c in list(px.items()):
    if x < 21 and 8 <= y <= 22 and c not in ('6D26BD', '9B5DE5', 'DAB8FE'):   # the gem, its ring and the head of the staff
        del px[(x, y)]
    elif c in STAFF and y <= 35 and (x < 28 or (x >= 46 and y >= 25) or c in ('2C2828', '545150')):
        if not (28 <= x <= 52 and y <= 16):                                  # (the hat shares two of these greys)
            px[(x, y)] = STAFF[c]

def put(x, y, c):
    if 0 <= x < 64 and 0 <= y < 64: px[(x, y)] = c

# stem from the tulip down to where the shaft starts
for i in range(9):
    x, y = 13 + i, 17 + round(i * 0.4)
    put(x, y, STEM_M); put(x, y + 1, STEM_D)
    if i % 3 == 0: put(x, y - 1, STEM_L)

# two long leaves off the stem
def leaf(pts):
    for k, (x, y) in enumerate(pts):
        w = 1 if k in (0, len(pts) - 1) else 2
        for d in range(w): put(x, y + d, LEAF_M if d == 0 else LEAF_D)
        if 0 < k < len(pts) - 1: put(x + 1, y + 1, LEAF_D)
        if 0 < k < len(pts) - 1: put(x, y, LEAF_L if k % 2 else LEAF_M)          # light midrib
leaf([(22, 21), (21, 23), (20, 25), (18, 27), (17, 29), (15, 30), (14, 31)])     # hangs down and back
leaf([(25, 22), (25, 20), (26, 18), (27, 17)])                                 # short one curling up

# ---- 2. the tulip, where the gem was (O outline, D dark, M mid, L light, H highlight)
TULIP = ["..O...O...O..",
         ".OMO.OLO.OMO.",
         ".OMMOLHLOMMO.",
         "OMMDOLHLODMMO",
         "OMMDMLHLMDMMO",
         "OMMDMLHLMDDMO",
         "OMDDMLLLMDDMO",
         "OMDDMMLMMDDDO",
         "OMDDMMLMMDDDO",
         ".OMDDMMMDDDO.",
         ".OMDDMMMDDDO.",
         "..OMDDDDDDO..",
         "...OODDDOO...",
         ".....OOO....."]
TC = {'O': T_O, 'D': T_D, 'M': T_M, 'L': T_L, 'H': T_H}
for r, row in enumerate(TULIP):
    for c, ch in enumerate(row):
        if ch in TC: put(7 + c, 4 + r, TC[ch])

# ---- 3. roses all over the cloak and hat
ROSE = [".OOO.", "OMLMO", "OLDMO", "OMDLO", ".OOO."]
SMALL = [".OO.", "OLMO", "OMDO", ".OO."]
RC = {'O': R_O, 'D': R_D, 'M': R_M, 'L': R_L}
TINY = ["OMO", "MLD", "ODO"]
ROBE = {'0C0521', '2A2039'}
def is_cloak(x, y): return px.get((x, y)) in CLOAK
def is_robe(x, y): return px.get((x, y)) in ROBE
def rose(x0, y0, art, leafside=1):
    for r, row in enumerate(art):
        for c, ch in enumerate(row):
            if ch in RC and (x0 + c, y0 + r) in px: px[(x0 + c, y0 + r)] = RC[ch]
    lx = x0 + (len(art[0]) if leafside > 0 else -1)                            # a leaf beside it
    for k, (dx, dy, col) in enumerate([(0, 1, LEAF_M), (leafside, 2, LEAF_L), (0, 2, LEAF_D)]):
        if is_cloak(lx + dx, y0 + dy): px[(lx + dx, y0 + dy)] = col

spots = []
for (x, y) in sorted(px):
    if not is_cloak(x, y): continue
    if all(is_cloak(x + dx, y + dy) for dx in range(4) for dy in range(4)) and all(abs(x - a) + abs(y - b) > 6 for a, b in spots):
        spots.append((x, y))
for i, (x, y) in enumerate(spots):
    rose(x, y, ROSE if i % 3 != 2 and all(is_cloak(x + dx, y + dy) for dx in range(5) for dy in range(5)) else SMALL, 1 if i % 2 else -1)
# tiny roses filling the gaps on the cloak, and climbing up the front of his robe
small = []
for (x, y) in sorted(px):
    ok = all(is_cloak(x + dx, y + dy) or is_robe(x + dx, y + dy) for dx in range(3) for dy in range(3))
    robe = sum(is_robe(x + dx, y + dy) for dx in range(3) for dy in range(3))
    if ok and (robe == 0 or y >= 30) and all(abs(x - a) + abs(y - b) > 5 for a, b in spots + small):
        small.append((x, y))
for (x, y) in small:
    rose(x, y, TINY, 1 if (x + y) % 2 else -1)
rose(39, 7, ROSE, -1)                                                          # big rose on the hat brim
rose(46, 6, SMALL, 1)

# vines: thin light-green tendrils winding over the dark cloak between the roses
for (x, y) in sorted(px):
    if px[(x, y)] == '2E5A2A' and (x * 3 + y * 5) % 17 == 0: px[(x, y)] = LEAF_M

# energy and sparks keep their purple codes so the animation still drifts and blinks them; they
# become petals and pollen when the frames are drawn
RECOLOR = {**CLOAK, '6D26BD': T_M, '9B5DE5': T_L, 'DAB8FE': 'FFF0A0', '560C83': T_D}
os.makedirs(os.path.dirname(sys.argv[2]), exist_ok=True)
mw.build(px, sys.argv[2], RECOLOR)
print(len(spots) + len(small) + 2, 'roses')
