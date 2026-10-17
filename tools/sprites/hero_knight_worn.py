"""Lacy's BATTLE-WORN costume: three damaged versions of every animation strip.
Run (after hero_knight.py):  python3 tools/sprites/hero_knight_worn.py
Reads  public/assets/fighters/hero-knight/<strip>_sheet.png
Writes public/assets/fighters/hero-knight/worn1/, worn2/, worn3/  (same strip names)

The game swaps to the next stage each time she loses a stock:
  worn1 - hairline cracks in the armour plates
  worn2 - longer, branching cracks, chips knocked out of the plates, tears in the bodysuit
  worn3 - armour shattered: big chunks missing, scorch marks, grime, and her helmet's visor broken
          open so one of her eyes shows through

Every crack is defined relative to her red scarf (found in each frame), so the damage stays on the
same part of her body as she moves instead of sliding around. Damage only lands on armour (grey
plates) and the bodysuit (blue-grey), never on the scarf, the sash or the sword swipes.
"""
import colorsys, math, os, random
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'fighters', 'hero-knight')
STRIPS = ['idle', 'run', 'attack1', 'attack2', 'jump', 'fall', 'hit', 'death', 'guard', 'grab', 'idle_u', 'run_u', 'jump_u', 'fall_u', 'hit_u']
FW, FH = 150, 90
CRACK, CHIP_LIGHT, HOLE, SCORCH = (26, 20, 24), (226, 226, 226), (34, 28, 34), (48, 40, 36)

def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
def is_hair(p):
    # her white hair / scarf: the bright, colourless pixels. Never damaged, so it can't look like it
    # passes through holes in her helmet.
    if p[3] < 255: return False
    h, s, v = hsv(p)
    return s < 0.12 and v >= 0.76
def is_armor(p):
    if p[3] < 255: return False
    h, s, v = hsv(p)
    return s < 0.12 and 0.28 < v < 0.76
def is_suit(p):
    if p[3] < 255: return False
    h, s, v = hsv(p)
    return 0.5 < h < 0.62 and 0.12 < s < 0.6
def is_red(p):
    if p[3] < 200: return False
    h, s, v = hsv(p)
    return (h < 0.05 or h > 0.95) and s > 0.4

def anchor(frame):
    """Top-centre of the red scarf: (x, y), or None (e.g. the white hit-flash frame)."""
    px = frame.load(); reds = [(x, y) for y in range(FH) for x in range(FW) if is_red(px[x, y])]
    if len(reds) < 4: return None
    top = min(y for x, y in reds)
    xs = [x for x, y in reds if y <= top + 3]
    return (sum(xs) / len(xs), top)

def crack_paths(stage):
    """Cracks as pixel paths relative to the anchor; later stages keep the earlier cracks and add more."""
    rng = random.Random(17)
    paths = []
    counts = [0, 9, 18, 30]
    for i in range(counts[stage]):
        # start somewhere on the body: helmet, shoulders, chest plate, thigh plates
        sx = rng.randint(-14, 14); sy = rng.choice([-7, -5, 1, 3, 6, 12, 14, 16, 18])
        length = (5 + rng.randint(0, 3)) if i < 9 else (6 + rng.randint(0, 5)) if i < 18 else (8 + rng.randint(0, 8))
        x, y, a = sx, sy, rng.uniform(0, math.tau)
        pts = [(x, y)]
        for _ in range(length):
            a += rng.uniform(-0.9, 0.9)
            x += round(math.cos(a)); y += round(math.sin(a))
            pts.append((x, y))
            if i >= 9 and rng.random() < 0.15:                      # branches on bigger cracks
                bx, by = x + rng.choice([-1, 1]), y + rng.choice([-1, 1])
                pts.append((bx, by))
        paths.append(pts)
    return paths

def chunks(stage):
    """Pieces of armour knocked out (stage 2+), relative to the anchor: (x, y, w, h)."""
    rng = random.Random(41)
    n = [0, 0, 4, 10][stage]
    return [(rng.randint(-14, 12), rng.choice([-6, 2, 5, 13, 15, 17]), rng.randint(2, 3 if stage == 2 else 4), rng.randint(1, 3)) for _ in range(n)]

# frames where her scarf is hidden (so anchor() finds nothing): where it would be, read off the sprite.
# attack2 frame 0 is the Grand Slam wind-up pose, shown the whole time the swing is charging.
ANCHOR_FALLBACK = {('attack2', 0): (69, 51)}

def damage(frame, stage, frame_index=0, fallback=None):
    out = frame.copy(); px = out.load(); src = frame.load()
    a = anchor(frame) or fallback
    if not a: return out
    ax, ay = a
    if stage == 3:                                                  # grime: everything a little darker and dirtier
        for y in range(FH):
            for x in range(FW):
                p = src[x, y]
                if is_armor(p) or is_suit(p):
                    px[x, y] = (int(p[0] * 0.82), int(p[1] * 0.8), int(p[2] * 0.78), 255)
    # chunks knocked out of the plates (dark gaps with a light broken rim above)
    for (cx, cy, w, h) in chunks(stage):
        for yy in range(h):
            for xx in range(w):
                X, Y = int(ax + cx + xx), int(ay + cy + yy)
                if 0 <= X < FW and 0 <= Y < FH and is_armor(src[X, Y]):
                    px[X, Y] = HOLE + (255,)
                    if yy == 0 and 0 <= Y - 1 < FH and is_armor(src[X, Y - 1]): px[X, Y - 1] = CHIP_LIGHT + (255,)
    # cracks: dark line with a lit edge on its upper side
    for pts in crack_paths(stage):
        for (cx, cy) in pts:
            X, Y = int(ax + cx), int(ay + cy)
            if not (0 <= X < FW and 0 <= Y < FH): continue
            p = src[X, Y]
            if is_armor(p):
                px[X, Y] = CRACK + (255,)
                if 0 <= Y - 1 < FH and is_armor(src[X, Y - 1]) and px[X, Y - 1][:3] != CRACK and stage >= 2:
                    q = src[X, Y - 1]; px[X, Y - 1] = (min(255, q[0] + 40), min(255, q[1] + 40), min(255, q[2] + 40), 255)
            elif is_suit(p) and stage >= 2:                         # torn bodysuit
                px[X, Y] = (int(p[0] * 0.45), int(p[1] * 0.45), int(p[2] * 0.5), 255)
    # scorch marks (stage 3)
    if stage == 3:
        rng = random.Random(77)
        for _ in range(7):
            cx, cy = rng.randint(-12, 12), rng.choice([2, 6, 12, 16, 20])
            for yy in range(-1, 2):
                for xx in range(-2, 3):
                    X, Y = int(ax + cx + xx), int(ay + cy + yy)
                    if 0 <= X < FW and 0 <= Y < FH and (is_armor(src[X, Y]) or is_suit(src[X, Y])) and abs(xx) + abs(yy) < 3:
                        q = px[X, Y]; px[X, Y] = ((q[0] + SCORCH[0]) // 2, (q[1] + SCORCH[1]) // 2, (q[2] + SCORCH[2]) // 2, 255)
    # stage 3: the visor is broken open and one eye shows (front of the helmet, just above the scarf)
    if stage == 3:
        ex, ey = int(ax + 2), int(ay - 4)
        hole = [(-1, -1), (0, -1), (1, -1), (2, -1), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0), (0, 1), (1, 1), (2, 1)]
        helmet = lambda X, Y: 0 <= X < FW and 0 <= Y < FH and src[X, Y][3] == 255 and not is_hair(src[X, Y]) and not is_red(src[X, Y])
        for dx, dy in hole:
            X, Y = ex + dx, ey + dy
            if helmet(X, Y): px[X, Y] = (40, 24, 26, 255)                                      # dark inside of the helmet
        for dx, dy in [(-2, -2), (3, -1), (4, 0), (-2, 1), (3, 2)]:                           # jagged broken edge
            X, Y = ex + dx, ey + dy
            if 0 <= X < FW and 0 <= Y < FH and is_armor(src[X, Y]): px[X, Y] = CHIP_LIGHT + (255,)
        for (dx, dy, c) in [(0, 0, (236, 230, 222)), (1, 0, (92, 168, 230)), (2, 0, (236, 230, 222)), (1, -1, (60, 40, 40))]:
            X, Y = ex + dx, ey + dy                                                           # the eye: white, blue iris, lid shadow
            if helmet(X, Y): px[X, Y] = c + (255,)
    # stage 3: a hole torn through the chest plate, showing her heart. The heart alternates between a
    # big and a small beat on every animation frame, so it pumps as she moves.
    if stage == 3:
        cx, cy = int(ax), int(ay + 6)
        body = lambda X, Y: 0 <= X < FW and 0 <= Y < FH and src[X, Y][3] == 255 and not is_hair(src[X, Y])
        cavity = [(dx, dy) for dy in range(-3, 4) for dx in range(-4, 5) if (dx * dx) / 18 + (dy * dy) / 11 <= 1]
        for dx, dy in cavity:
            if body(cx + dx, cy + dy): px[cx + dx, cy + dy] = (52, 14, 20, 255)                   # dark flesh inside
        for dx, dy in cavity:                                                                 # jagged broken rim
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = cx + dx + ox, cy + dy + oy
                if (dx + ox, dy + oy) not in cavity and body(X, Y) and (X + Y) % 3:
                    px[X, Y] = CHIP_LIGHT + (255,) if oy < 0 or (X % 2) else CRACK + (255,)
        big = frame_index % 2 == 0
        heart = ([' X X ', 'XXXXX', 'XXXXX', ' XXX ', '  X  '] if big else ['X X', 'XXX', ' X '])
        hx, hy = cx - len(heart[0]) // 2, cy - len(heart) // 2
        for r, row in enumerate(heart):
            for c2, ch in enumerate(row):
                if ch == 'X' and body(hx + c2, hy + r):
                    col = (255, 120, 120) if (r == 1 and c2 <= 1) else (110, 10, 20) if r == len(heart) - 1 else (205, 32, 44)
                    px[hx + c2, hy + r] = col + (255,)
    return out

for stage in (1, 2, 3):
    od = os.path.join(DIR, 'worn%d' % stage); os.makedirs(od, exist_ok=True)
    for name in STRIPS:
        sheet = Image.open(os.path.join(DIR, name + '_sheet.png')).convert('RGBA')
        out = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
        for i in range(sheet.width // FW):
            out.alpha_composite(damage(sheet.crop((i * FW, 0, (i + 1) * FW, FH)), stage, i, ANCHOR_FALLBACK.get((name, i))), (i * FW, 0))
        out.save(os.path.join(od, name + '_sheet.png'))
    print('stage', stage, 'done')
