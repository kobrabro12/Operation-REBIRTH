"""Lacy's grab strip: a real reach-and-grab with her free hand instead of a sword swing.
Run (after hero_knight.py, before hero_knight_worn.py and hero_knight_samurai.py, which also process it):
    python3 tools/sprites/hero_knight_grab.py
Reads  public/assets/fighters/hero-knight/idle_sheet.png and guard_sheet.png
Writes public/assets/fighters/hero-knight/grab_sheet.png  (8 frames of 150x90, feet at (66, 86))

She keeps her sword held back over her shoulder and reaches out with her other, armoured arm:
  0  wind-up      - arm drawn back to her chest
  1  reach        - leaning in, open hand halfway out
  2  full reach   - arm straight out, fingers spread
  3  grip         - hand closes on the opponent
  4  hold         - pulls them in, fist at arm's length
  5  shove        - throws her weight forward, arm punched straight out (forward throw; flipped for back throw)
  6  heave        - fist raised over her head (up throw)
  7  slam         - crouched, fist driven down to the floor (down throw)
  8  sword thrown - her sword is gone from her shoulder, open hand thrust forward (side special:
                    she commands the spinning sword)
  9  sword thrown - the same, hand slightly lower (alternates with 8 while she waits)
She grabs with her FREE hand: her sword hand stays where it is, gripping the hilt by her face, and the
other arm (the one hanging down behind her) is erased and redrawn reaching out from her far shoulder.
It's drawn behind her body, so it comes out from behind her chest the way a far arm would; only the
gauntlet is drawn over her when her hand is in front of her body. Positions are relative to her red
scarf, so the arm stays on her shoulder in every pose.
"""
import colorsys, math, os
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'fighters', 'hero-knight')
FW, FH = 150, 90
OUT = (51, 60, 63, 255)                                   # her outline / darkest plate
PLATE, PLATE_LIT, PLATE_DARK = (146, 156, 160, 255), (164, 174, 178, 255), (102, 121, 128, 255)
STEEL, STEEL_LIT = (136, 136, 136, 255), (201, 201, 201, 255)

def is_red(p):
    if p[3] < 200: return False
    h, s, v = colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
    return (h < 0.05 or h > 0.95) and s > 0.4

def anchor(frame):
    px = frame.load(); reds = [(x, y) for y in range(FH) for x in range(FW) if is_red(px[x, y])]
    top = min(y for x, y in reds)
    xs = [x for x, y in reds if y <= top + 3]
    return (round(sum(xs) / len(xs)), top)

def unarmed(frame):
    """Erase the sword she holds back over her shoulder (blade pixels up and behind her head)."""
    out = frame.copy(); px = out.load()
    ax, ay = anchor(frame)
    for y in range(FH):
        for x in range(FW):
            p = px[x, y]
            if p[3] == 0: continue
            blade = p[:3] in ((201, 201, 201), (194, 194, 194))
            behind = x <= ax - 6 and y <= ay - 6 and p[:3] in ((136, 136, 136), (158, 157, 157), (163, 163, 163))
            if (blade and y < ay + 2) or behind: px[x, y] = (0, 0, 0, 0)
    return out

def free_arm_erased(frame):
    """Erase the free arm hanging down behind her (the grey rod below and behind her scarf), so the
    reaching arm replaces it instead of being a third arm."""
    out = frame.copy(); px = out.load()
    ax, ay = anchor(frame)
    ARM = ((156, 156, 156), (102, 102, 102), (81, 81, 81), (133, 133, 133))
    for y in range(ay + 3, FH):
        for x in range(0, ax - 4):
            if px[x, y][3] and px[x, y][:3] in ARM: px[x, y] = (0, 0, 0, 0)
    return out

def shifted(frame, dx, dy=0):
    out = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); out.alpha_composite(frame, (dx, dy)); return out

def arm(img, sx, sy, hx, hy, hand, bend=3, hand_only=False):
    """An armoured arm from the shoulder (sx, sy) through a bent elbow to the hand (hx, hy).
    hand: 'open' or 'fist'. bend: how far the elbow drops below the straight line (pixels).
    hand_only: draw just the gauntlet (to lay over her body when the hand is in front of it)."""
    px = img.load()
    L = max(1, math.hypot(hx - sx, hy - sy))
    ex, ey = (sx + hx) / 2 - (hy - sy) / L * bend * (1 if hx >= sx else -1), (sy + hy) / 2 + abs(hx - sx) / L * bend
    pts = []
    for (ax, ay, bx, by) in ((sx, sy, ex, ey), (ex, ey, hx, hy)):
        n = int(math.hypot(bx - ax, by - ay) * 2) + 1
        pts += [(ax + (bx - ax) * i / n, ay + (by - ay) * i / n) for i in range(n + 1)]
    put = lambda x, y, c: (0 <= x < FW and 0 <= y < FH) and px.__setitem__((x, y), c)
    if hand_only: pts = []
    for x, y in pts:                                       # outline
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                if abs(dx) + abs(dy) <= 2: put(round(x) + dx, round(y) + dy, OUT)
    for i, (x, y) in enumerate(pts):                       # vambrace / pauldron plates
        k = i / len(pts)
        for dx in range(-1, 2):
            for dy in range(-1, 2):
                if abs(dx) + abs(dy) <= (1 if k < 0.5 else 2): put(round(x) + dx, round(y) + dy, PLATE_DARK if dy == 1 else PLATE)   # thinner upper arm, plated forearm
        put(round(x), round(y) - 1, PLATE_LIT)
    put(round(ex), round(ey), OUT); put(round(ex), round(ey) + 1, PLATE_DARK)   # elbow joint
    if not hand_only:                                      # shoulder pauldron: a rounded plate over the joint
        for dx in range(-3, 4):
            for dy in range(-3, 2):
                if dx * dx + dy * dy <= 9: put(sx + dx, sy + dy, OUT if dx * dx + dy * dy > 5 else (PLATE_LIT if dy < 0 else PLATE))
    # gauntlet
    ux, uy = (hx - sx) / L, (hy - sy) / L
    hx, hy = round(hx), round(hy)
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            if abs(dx) + abs(dy) <= 4: put(hx + dx, hy + dy, OUT)
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if abs(dx) + abs(dy) <= 3: put(hx + dx, hy + dy, STEEL)
    put(hx - 1, hy - 1, STEEL_LIT); put(hx, hy - 1, STEEL_LIT)
    if hand == 'open':                                      # spread fingers past the palm
        for f in (-2, 0, 2):
            fx, fy = hx + round(ux * 4 - uy * f), hy + round(uy * 4 + ux * f)
            put(fx, fy, STEEL); put(fx + round(ux), fy + round(uy), OUT)
    else:                                                   # knuckles of a closed fist
        put(hx + round(ux * 2), hy + round(uy * 2) - 1, STEEL_LIT); put(hx + round(ux * 2), hy + round(uy * 2) + 1, STEEL)

idle = Image.open(os.path.join(DIR, 'idle_sheet.png')).convert('RGBA').crop((0, 0, FW, FH))
guard = Image.open(os.path.join(DIR, 'guard_sheet.png')).convert('RGBA').crop((0, 0, FW, FH))
#       base   shift  hand offset from the scarf   hand
POSES = [(idle, -1, (7, 9), 'fist', 3),
         (idle, 2, (15, 7), 'open', 3),
         (idle, 4, (22, 5), 'open', 1),
         (idle, 4, (21, 5), 'fist', 1),
         (idle, 1, (17, 7), 'fist', 3),
         (idle, 6, (25, 3), 'open', 0),
         (idle, 0, (8, -17), 'fist', -3),
         (guard, 2, (17, 18), 'fist', 2),
         (unarmed(idle), 3, (24, 3), 'open', 0),
         (unarmed(idle), 3, (23, 5), 'open', 1)]
sheet = Image.new('RGBA', (FW * len(POSES), FH), (0, 0, 0, 0))
for i, (base, dx, (ox, oy), hand, bend) in enumerate(POSES):
    f = free_arm_erased(shifted(base, dx))
    ax, ay = anchor(f)
    sx, sy = ax - 1, ay + 4                                 # her far shoulder, just behind the scarf
    frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    arm(frame, sx, sy, ax + ox, ay + oy, hand, bend)       # the arm, behind her
    frame.alpha_composite(f)                               # her body over it
    arm(frame, sx, sy, ax + ox, ay + oy, hand, bend, hand_only=True)   # the gauntlet always shows
    sheet.alpha_composite(frame, (i * FW, 0))
sheet.save(os.path.join(DIR, 'grab_sheet.png'))
print('saved grab_sheet.png', sheet.size)
