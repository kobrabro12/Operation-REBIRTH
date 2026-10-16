"""Lacy's SAMURAI costume: red lacquered samurai armour and a sleek katana.
Run (after hero_knight.py):  python3 tools/sprites/hero_knight_samurai.py
Reads  public/assets/fighters/hero-knight/<strip>_sheet.png
Writes public/assets/fighters/hero-knight/samurai/<strip>_sheet.png  (same strip names and frame layout)

What changes, pixel by pixel:
  - her blue-grey plate armour (arms, chest, legs) becomes red lacquer, with rows of dark lacing and
    little gold stitches across it, like the laced plates of a samurai's armour
  - the dark blue cloth under it becomes black
  - her gauntlets and sleeves become black lacquer
  - her helmet becomes a black-lacquered kabuto with a gold crescent crest on the front
  - the red scarf becomes a gold cord, so it stands out against the red armour
  - the sword becomes a katana: a bright, polished blade with a cool sheen, a gold guard (tsuba)
    and a black-wrapped grip with gold diamonds
  - her sword swipes get a faint red tint
Her white hair is left alone.

Everything is placed relative to the top of her scarf (found in each frame), so the details stay on
the same part of her body as she moves.
"""
import colorsys, math, os
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'fighters', 'hero-knight')
STRIPS = ['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard']
FW, FH = 150, 90

RED = [(46, 6, 12), (82, 12, 20), (124, 20, 28), (166, 30, 34), (202, 48, 44), (234, 86, 70)]   # red lacquer, dark -> light
BLACK = [(16, 13, 18), (30, 25, 32), (48, 41, 50), (72, 64, 74), (104, 96, 108)]               # black lacquer
GOLD = [(110, 66, 12), (182, 124, 26), (232, 182, 58), (255, 228, 140)]
CLOTH = [(14, 12, 16), (28, 24, 30)]
LACE = (58, 8, 16)
BLADE = {(201, 201, 201): (238, 242, 250), (194, 194, 194): (182, 196, 214)}

def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
def ramp(r, v, lo, hi):
    k = min(0.999, max(0, (v - lo) / (hi - lo)))
    return r[int(k * len(r))]
def is_red(p):
    if p[3] < 200: return False
    h, s, v = hsv(p)
    return (h < 0.05 or h > 0.95) and s > 0.4
def is_plate(p):                     # blue-grey armour plates
    if p[3] < 255: return False
    h, s, v = hsv(p)
    return 0.5 < h < 0.6 and 0.06 < s < 0.3
def is_cloth(p):                     # dark blue undercloth / belt
    if p[3] < 255: return False
    h, s, v = hsv(p)
    return 0.5 < h < 0.62 and s >= 0.3
def is_grey(p):
    if p[3] < 255: return False
    h, s, v = hsv(p)
    return s < 0.06

def anchor(frame):
    px = frame.load(); reds = [(x, y) for y in range(FH) for x in range(FW) if is_red(px[x, y])]
    if len(reds) < 4: return None
    top = min(y for x, y in reds)
    xs = [x for x, y in reds if y <= top + 3]
    return (sum(xs) / len(xs), top)

def blade_pixels(src):
    """The longest connected run of blade-coloured pixels (the sword), or []."""
    pts = {(x, y) for y in range(FH) for x in range(FW) if src[x, y][:3] in BLADE and src[x, y][3] == 255}
    best, seen = [], set()
    for p in pts:
        if p in seen: continue
        comp, stack = [], [p]; seen.add(p)
        while stack:
            x, y = stack.pop(); comp.append((x, y))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q in pts and q not in seen: seen.add(q); stack.append(q)
        if len(comp) > len(best): best = comp
    xs = [x for x, y in best] or [0]; ys = [y for x, y in best] or [0]
    return best if max(max(xs) - min(xs), max(ys) - min(ys)) >= 8 else []

def samurai(frame):
    out = frame.copy(); px = out.load(); src = frame.load()
    a = anchor(frame)
    if not a:                                                       # white hit-flash frame etc.
        return out
    ax, ay = a
    helmet = lambda x, y: ax - 6 <= x <= ax + 10 and ay - 11 <= y <= ay and is_grey(src[x, y]) and src[x, y][:3] not in BLADE
    helm_pts = []
    for y in range(FH):
        for x in range(FW):
            p = src[x, y]
            if p[3] == 0: continue
            if p[3] < 255 and p[:3] == (255, 255, 255):              # sword swipe: faint red tint
                px[x, y] = (255, 196, 190, p[3]); continue
            h, s, v = hsv(p)
            if is_plate(p):
                c = ramp(RED, v, 0.2, 0.74)
                inside = all(0 <= x + dx < FW and 0 <= y + dy < FH and is_plate(src[x + dx, y + dy]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                row = int(y - ay) % 4
                if inside and row == 3 and y > ay + 2:                 # lacing rows across the plates, with gold stitches
                    c = GOLD[2] if int(x - ax) % 4 == 0 else LACE
                px[x, y] = c + (255,)
            elif is_cloth(p):
                px[x, y] = ramp(CLOTH, v, 0.2, 0.3) + (255,)
            elif is_red(p):                                         # scarf -> gold cord
                px[x, y] = ramp(GOLD, v, 0.4, 0.56) + (255,)
            elif helmet(x, y):
                px[x, y] = ramp(BLACK, v, 0.26, 0.66) + (255,); helm_pts.append((x, y))
            elif p[:3] in BLADE:
                px[x, y] = BLADE[p[:3]] + (255,)
            elif is_grey(p) and v < 0.68 and x >= ax - 2 and y > ay - 4:  # gauntlets and sleeves (hair braid hangs behind her)
                px[x, y] = ramp(BLACK, v, 0.26, 0.66) + (255,)
    # kabuto crest: a gold crescent standing on the front of the helmet
    if helm_pts:
        top = min(y for x, y in helm_pts)
        tx = round(sum(x for x, y in helm_pts if y <= top + 1) / max(1, len([1 for x, y in helm_pts if y <= top + 1]))) + 1
        crest = [(-3, -4), (3, -4), (-3, -3), (3, -3), (-2, -2), (2, -2), (-1, -1), (0, -1), (1, -1)]
        for dx, dy in crest:
            X, Y = tx + dx, top + dy
            if 0 <= X < FW and 0 <= Y < FH and src[X, Y][3] < 255:
                px[X, Y] = (GOLD[3] if dy <= -3 else GOLD[2] if dy == -2 else GOLD[1]) + (255,)
        for dx in (-1, 0, 1):                                        # gold band where the crest meets the helmet
            X = tx + dx
            if (X, top) in helm_pts: px[X, top] = GOLD[1] + (255,)
    # katana: polished blade with a sheen line, gold tsuba and a wrapped grip at the end nearest her body
    blade = blade_pixels(src)
    if blade:
        hx, hy = ax + 4, ay - 2                                     # roughly her sword hand
        hilt = min(blade, key=lambda p: (p[0] - hx) ** 2 + (p[1] - hy) ** 2)
        tip = max(blade, key=lambda p: (p[0] - hilt[0]) ** 2 + (p[1] - hilt[1]) ** 2)
        L = math.hypot(tip[0] - hilt[0], tip[1] - hilt[1]) or 1
        ux, uy = (tip[0] - hilt[0]) / L, (tip[1] - hilt[1]) / L
        for (x, y) in blade:                                         # a travelling glint along the blade
            d = math.hypot(x - hilt[0], y - hilt[1])
            if int(d) % 7 == 3: px[x, y] = (255, 255, 255, 255)
        # grip: 4 px back from the hilt, black wrap with gold diamonds
        for i in range(1, 5):
            X, Y = round(hilt[0] - ux * i), round(hilt[1] - uy * i)
            if 0 <= X < FW and 0 <= Y < FH and (src[X, Y][3] < 255 or src[X, Y][:3] in BLADE):
                px[X, Y] = (GOLD[2] if i % 2 == 0 else BLACK[0]) + (255,)
        # tsuba: a small gold guard across the blade at the hilt
        nx, ny = -uy, ux
        for k in (-1, 0, 1):
            X, Y = round(hilt[0] + nx * k), round(hilt[1] + ny * k)
            if 0 <= X < FW and 0 <= Y < FH and (src[X, Y][3] < 255 or src[X, Y][:3] in BLADE):
                px[X, Y] = (GOLD[3] if k == 0 else GOLD[1]) + (255,)
    return out

od = os.path.join(DIR, 'samurai'); os.makedirs(od, exist_ok=True)
for name in STRIPS:
    sheet = Image.open(os.path.join(DIR, name + '_sheet.png')).convert('RGBA')
    out = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    for i in range(sheet.width // FW):
        out.alpha_composite(samurai(sheet.crop((i * FW, 0, (i + 1) * FW, FH))), (i * FW, 0))
    out.save(os.path.join(od, name + '_sheet.png'))
print('samurai strips saved to', od)
