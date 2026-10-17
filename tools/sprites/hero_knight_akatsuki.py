"""Lacy's AKATSUKI costume ("dawn"): a deep crimson tunic, a dark leather belt, wrapped cloth boots and a
crystal-bladed sword - a wandering hero out of a Japanese adventure story.
Run (after hero_knight.py, hero_knight_grab.py and hero_knight_unarmed.py):
    python3 tools/sprites/hero_knight_akatsuki.py
Reads  public/assets/fighters/hero-knight/<strip>_sheet.png
Writes public/assets/fighters/hero-knight/akatsuki/<strip>_sheet.png  (same strip names and frame layout)

Pixel by pixel:
  - her blue-grey armour plates become a crimson cloth tunic (soft folds, no plate seams)
  - the dark blue undercloth becomes dark leather, and a belt is drawn across her waist: a band of dark
    leather with a small brass buckle at the front
  - everything in the lowest rows (her boots) becomes off-white cloth wrapped in diagonal bands
  - her helmet becomes a dark crimson hood; gauntlets and sleeves become brown leather gloves
  - the red scarf becomes a cream scarf, so it stands out on the red tunic
  - the sword becomes crystal: a pale aqua blade with a white glint running along it and a brass hilt
  - her sword swipes get a faint aqua tint
Her white hair is left alone. Positions are relative to the top of her scarf (found in each frame),
using the same anchor and blade finding as hero_knight_samurai.py.
"""
import importlib.util, math, os, sys

spec = importlib.util.spec_from_file_location('sam', os.path.join(os.path.dirname(__file__), 'hero_knight_samurai.py'))
src_code = open(spec.origin).read()
sam = {'__file__': spec.origin}
exec(src_code[:src_code.index("od = os.path.join")], sam)          # just the helpers, not the samurai run
from PIL import Image

DIR, STRIPS, FW, FH = sam['DIR'], sam['STRIPS'], sam['FW'], sam['FH']
hsv, ramp, is_red, is_plate, is_cloth, is_grey = sam['hsv'], sam['ramp'], sam['is_red'], sam['is_plate'], sam['is_cloth'], sam['is_grey']
anchor, blade_pixels, BLADE, FALLBACK = sam['anchor'], sam['blade_pixels'], sam['BLADE'], sam['ANCHOR_FALLBACK']

TUNIC = [(58, 6, 14), (96, 12, 24), (140, 20, 34), (178, 32, 44), (210, 58, 62)]      # deep crimson cloth
HOOD = [(40, 6, 12), (70, 12, 20), (102, 20, 30), (132, 34, 42)]
LEATHER = [(34, 20, 14), (58, 36, 24), (84, 54, 36), (112, 76, 50)]
WRAP = [(120, 108, 92), (170, 158, 138), (214, 204, 184), (238, 232, 216)]          # cloth boot wraps
CREAM = [(150, 132, 96), (206, 188, 146), (240, 228, 196)]
CRYSTAL = {(201, 201, 201): (191, 246, 255), (194, 194, 194): (111, 214, 240)}
BRASS = [(122, 82, 26), (196, 150, 58), (246, 214, 120)]

def akatsuki(frame, fallback=None):
    out = frame.copy(); px = out.load(); src = frame.load()
    a = anchor(frame) or fallback
    if not a: return out                                       # e.g. the white hit-flash frame
    ax, ay = round(a[0]), round(a[1])
    ys = [y for y in range(FH) for x in range(FW) if src[x, y][3] == 255]
    foot = max(ys) if ys else FH - 1
    for y in range(FH):
        for x in range(FW):
            p = src[x, y]
            if p[3] == 0: continue
            if p[3] < 255 and p[:3] == (255, 255, 255): px[x, y] = (200, 246, 255, p[3]); continue   # aqua swipe
            h, s, v = hsv(p)
            boot = y >= foot - 8 and (is_plate(p) or is_cloth(p) or is_grey(p)) and p[:3] not in CRYSTAL
            if boot:                                            # cloth wraps, banded diagonally
                band = (x + y) % 4
                px[x, y] = (WRAP[0] if band == 0 else ramp(WRAP[1:], v, 0.2, 0.75)) + (255,)
            elif is_plate(p):
                px[x, y] = ramp(TUNIC, v, 0.2, 0.74) + (255,)
            elif is_cloth(p):
                px[x, y] = ramp(LEATHER, v, 0.15, 0.32) + (255,)
            elif is_red(p):
                px[x, y] = ramp(CREAM, v, 0.4, 0.56) + (255,)
            elif ax - 6 <= x <= ax + 10 and ay - 11 <= y <= ay and is_grey(p) and p[:3] not in CRYSTAL:
                px[x, y] = ramp(HOOD, v, 0.26, 0.66) + (255,)
            elif p[:3] in CRYSTAL:
                px[x, y] = CRYSTAL[p[:3]] + (255,)
            elif is_grey(p) and v < 0.68 and x >= ax - 2 and y > ay - 4:
                px[x, y] = ramp(LEATHER, v, 0.26, 0.66) + (255,)
    # the belt: a band across her waist with a brass buckle
    by = min(ay + 9, FH - 2)
    row = [x for x in range(ax - 9, ax + 10) if 0 <= x < FW and src[x, by][3] == 255 and (is_plate(src[x, by]) or is_cloth(src[x, by]) or is_red(src[x, by]))]
    if len(row) >= 4:
        for x in range(min(row), max(row) + 1):
            for dy in (0, 1):
                if src[x, by + dy][3] == 255: px[x, by + dy] = (LEATHER[1] if dy else LEATHER[0]) + (255,)
        bx = (min(row) + max(row)) // 2 + 1
        for dx in (-1, 0, 1):
            for dy in (0, 1):
                if 0 <= bx + dx < FW: px[bx + dx, by + dy] = (BRASS[2] if (dx, dy) == (0, 0) else BRASS[1]) + (255,)
    # crystal blade: a glint every few pixels and a brass hilt nearest her hand
    blade = blade_pixels(src)
    if blade:
        hx, hy = ax + 4, ay - 2
        hilt = min(blade, key=lambda q: (q[0] - hx) ** 2 + (q[1] - hy) ** 2)
        for (x, y) in blade:
            d = math.hypot(x - hilt[0], y - hilt[1])
            if int(d) % 6 == 2: px[x, y] = (255, 255, 255, 255)
            elif int(d) % 6 == 4: px[x, y] = (150, 236, 255, 255)
        tip = max(blade, key=lambda q: (q[0] - hilt[0]) ** 2 + (q[1] - hilt[1]) ** 2)
        L = math.hypot(tip[0] - hilt[0], tip[1] - hilt[1]) or 1
        ux, uy = (tip[0] - hilt[0]) / L, (tip[1] - hilt[1]) / L
        for k in (-1, 0, 1):                                    # brass guard across the blade
            X, Y = round(hilt[0] - uy * k), round(hilt[1] + ux * k)
            if 0 <= X < FW and 0 <= Y < FH: px[X, Y] = (BRASS[2] if k == 0 else BRASS[1]) + (255,)
    return out

od = os.path.join(DIR, 'akatsuki'); os.makedirs(od, exist_ok=True)
for name in STRIPS:
    sheet = Image.open(os.path.join(DIR, name + '_sheet.png')).convert('RGBA')
    res = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    for i in range(sheet.width // FW):
        res.alpha_composite(akatsuki(sheet.crop((i * FW, 0, (i + 1) * FW, FH)), FALLBACK.get((name, i))), (i * FW, 0))
    res.save(os.path.join(od, name + '_sheet.png'))
print('akatsuki strips saved to', od)
