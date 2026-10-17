"""Soul Summoner's jump and fall animations, built from his idle frames.
Run:  python3 tools/sprites/soul_summoner_air.py
Reads  public/assets/fighters/soul-summoner/idle_sheet.png
Writes public/assets/fighters/soul-summoner/jump_sheet.png and fall_sheet.png (4 frames each, 64x64)

Each frame starts from an idle frame (so the flame keeps flickering) and reshapes three parts:
  JUMP (rising)  - his legs tuck up under the robe, the front knee raised; the cape is dragged down
                   behind him; the flame in his palm is squashed low and sheds a few sparks that fall
                   away below his hand, as if the rush of air pushes it down
  FALL           - his legs hang straight down, feet dangling a pixel apart in turn; the cape billows
                   up and back; the flame streams tall above his palm, swaying, as the air rushes up
"""
import os
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'fighters', 'soul-summoner')
FLAME = {(0x07, 0x6C, 0xC2), (0x78, 0xA0, 0xC6), (0xF0, 0xF2, 0xF3)}
BASE_Y = 27                 # where the flame meets his palm
LEG_Y = 49                  # legs below the robe: rows 49..58
FEET = 58

def parts(frame):
    px = frame.load(); body, cape, flame = {}, {}, {}
    for y in range(64):
        for x in range(64):
            p = px[x, y]
            if not p[3]: continue
            if p[:3] in FLAME and x >= 44: flame[(x, y)] = p
            elif x <= 25 and y >= 22 and p[2] > p[1] + 3: cape[(x, y)] = p
            else: body[(x, y)] = p
    return body, cape, flame

def rows(d):
    r = {}
    for (x, y), c in d.items(): r.setdefault(y, {})[x] = c
    return r

def legs(body, out, dest_rows, shift):
    """Redraw the legs (body rows LEG_Y..FEET) squeezed or stretched into dest_rows rows.
    shift(x, row_k) moves pixels sideways (row_k: 0 at the hip, 1 at the feet)."""
    R = rows(body)
    for d in range(dest_rows):
        k = d / max(1, dest_rows - 1)
        sy = LEG_Y + round(k * (FEET - LEG_Y))
        for x, c in R.get(sy, {}).items(): out[(x + shift(x, k), LEG_Y + d)] = c

def flame_rows(flame, out, stretch, sway):
    """The flame: its round base stays on the palm; the thin tip above it is scaled by `stretch`."""
    R = rows(flame)
    top = min(R) if R else BASE_Y
    for y, cols in R.items():
        if BASE_Y - y <= 8:
            for x, c in cols.items(): out[(x, y)] = c
    tip = [y for y in R if BASE_Y - y > 8]
    if not tip: return
    lo = BASE_Y - 8                                   # the tip starts above this row
    height = lo - top
    new_h = max(1, round(height * stretch))
    for d in range(1, new_h + 1):                     # inverse map: each new row samples the old tip
        sy = lo - max(1, round(d / stretch))
        if sy not in R: continue
        k = d / new_h
        for x, c in R[sy].items(): out[(x + round(sway * k * k), lo - d)] = c

def build(kind):
    idle = Image.open(os.path.join(DIR, 'idle_sheet.png')).convert('RGBA')
    sheet = Image.new('RGBA', (64 * 4, 64), (0, 0, 0, 0))
    for f in range(4):
        src = idle.crop(((f * 8) * 64, 0, (f * 8) * 64 + 64, 64))
        body, cape, flame = parts(src)
        out = {}
        if kind == 'jump':
            moved = {}
            for (x, y), c in cape.items():               # dragged down and in behind him
                moved[(x + round(max(0, y - 30) * 0.06), y + round(max(0, y - 28) * 0.14) + (f % 2))] = c
            for (x, y), c in list(moved.items()):        # stretching opens 1-px gaps between rows: fill them
                if (x, y + 1) not in moved and (x, y + 2) in moved: moved[(x, y + 1)] = c
            out.update(moved)
            for (x, y), c in body.items():
                if y < LEG_Y: out[(x, y)] = c
            legs(body, out, 6, lambda x, k: (2 if x >= 31 else 1) if k > 0.3 else 0)   # tucked, knees forward
            flame_rows(flame, out, 0.45, -1)
            sparks = [(47, 29), (49, 31), (46, 33), (48, 35)]
            for i, (sx, sy) in enumerate(sparks):        # sparks shed below the hand
                if (i + f) % 2 == 0: out[(sx + (f % 2), sy + f)] = (0x78, 0xA0, 0xC6, 255) if i % 2 else (0xF0, 0xF2, 0xF3, 255)
        else:
            for (x, y), c in cape.items():               # billowing up and back
                k = max(0, y - 34)
                out[(x - round(k * 0.18) - (f % 2), y - round(k * 0.42) - (1 if f in (1, 2) else 0))] = c
            for (x, y), c in body.items():
                if y < LEG_Y: out[(x, y)] = c
            legs(body, out, 12, lambda x, k: (0 if k < 0.7 else ((1 if f % 2 else 0) if x >= 31 else (-1 if f % 2 == 0 else 0))))   # hanging, feet dangling
            flame_rows(flame, out, 1.6, (1, 2, 1, 0)[f])
        img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        for (x, y), c in out.items():
            if 0 <= x < 64 and 0 <= y < 64: img.putpixel((x, y), c)
        sheet.alpha_composite(img, (f * 64, 0))
    sheet.save(os.path.join(DIR, kind + '_sheet.png'))
    print('saved', kind + '_sheet.png')

build('jump'); build('fall')
