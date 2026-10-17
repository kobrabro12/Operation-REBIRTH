"""Lacy without her sword: copies of her movement strips with the blade erased, shown while her sword
is out spinning (side special, Blade Toss) so she can run and jump around empty-handed.
Run (after hero_knight.py, before hero_knight_worn.py and hero_knight_samurai.py, which also process them):
    python3 tools/sprites/hero_knight_unarmed.py
Reads  public/assets/fighters/hero-knight/<strip>_sheet.png   for idle, run, jump, fall, hit
Writes public/assets/fighters/hero-knight/<strip>_u_sheet.png  (same frames, no sword)

The blade is found as every run of the sword's two steel colours (201 and 194 grey) that is at least
5 pixels long; neighbouring grey pixels outside her helmet (the blade's shading and the hilt) go too.
"""
import colorsys, os
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'fighters', 'hero-knight')
STRIPS = ['idle', 'run', 'jump', 'fall', 'hit']
FW, FH = 150, 90
BLADE = {(201, 201, 201), (194, 194, 194)}

def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
def is_red(p):
    if p[3] < 200: return False
    h, s, v = hsv(p)
    return (h < 0.05 or h > 0.95) and s > 0.4

def anchor(px):
    reds = [(x, y) for y in range(FH) for x in range(FW) if is_red(px[x, y])]
    if len(reds) < 4: return None
    top = min(y for x, y in reds); xs = [x for x, y in reds if y <= top + 3]
    return (sum(xs) / len(xs), top)

def unarmed(frame):
    out = frame.copy(); px = out.load()
    a = anchor(px)
    if not a: return out                                   # e.g. the white hit-flash frame: leave it
    ax, ay = a
    pts = {(x, y) for y in range(FH) for x in range(FW) if px[x, y][3] == 255 and px[x, y][:3] in BLADE}
    gone, seen = set(), set()
    for p in pts:                                          # connected runs of blade steel
        if p in seen: continue
        comp, stack = [], [p]; seen.add(p)
        while stack:
            x, y = stack.pop(); comp.append((x, y))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q in pts and q not in seen: seen.add(q); stack.append(q)
        if len(comp) >= 5: gone.update(comp)
    helmet = lambda x, y: ax - 6 <= x <= ax + 10 and ay - 12 <= y <= ay + 1
    for _ in range(2):                                     # the blade's grey shading and the hilt beside it
        grow = set()
        for (x, y) in gone:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q in gone or not (0 <= q[0] < FW and 0 <= q[1] < FH) or helmet(*q): continue
                    p = px[q]
                    if p[3] == 255:
                        h, s, v = hsv(p)
                        if s < 0.06 and 0.45 < v < 0.8: grow.add(q)
        gone |= grow
    for q in gone: px[q] = (0, 0, 0, 0)
    return out

for name in STRIPS:
    sheet = Image.open(os.path.join(DIR, name + '_sheet.png')).convert('RGBA')
    res = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    for i in range(sheet.width // FW):
        res.alpha_composite(unarmed(sheet.crop((i * FW, 0, (i + 1) * FW, FH))), (i * FW, 0))
    res.save(os.path.join(DIR, name + '_u_sheet.png'))
print('unarmed strips saved:', ', '.join(s + '_u' for s in STRIPS))
