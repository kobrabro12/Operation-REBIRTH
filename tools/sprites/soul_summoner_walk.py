"""Soul Summoner walk cycle, built from the same pixel art as his idle (soul_summoner_idle.svg).
Run:  python3 tools/sprites/soul_summoner_walk.py tools/sprites/soul_summoner_idle.svg public/assets/fighters/soul-summoner/walk_sheet.png
Output: 8 frames of 64x64 side by side, facing right like the idle. The game plays them faster when he runs.

Nothing is redrawn: the legs below the hips are split into a front and a back leg and sheared forward and
back (hip fixed, foot moving most), the foot that swings forward is lifted, the body bobs up 1 px as the legs
pass, the hanging arm swings against the legs, the cape trails and flaps behind him, and the hand flame
keeps burning.
"""
import math, re, sys
from PIL import Image

N = 8
FLAME_COLS = {"076CC2", "78A0C6", "F0F2F3"}
BASE_Y = 27
EYES = [(33, 13), (35, 13), (33, 14), (35, 14)]
HIP_Y, FOOT_Y, SPLIT_X, BACK_LEG_X0 = 46, 57, 31, 23        # legs = body rows below the hips; x <= SPLIT_X is the back leg
ARM_X1, ARM_Y0, ARM_Y1 = 27, 24, 39        # the hanging arm on the viewer's left
SRC = open(sys.argv[1]).read()

def hx(s): return tuple(int(s[i:i+2], 16) for i in (0, 2, 4)) + (255,)
def is_cape(x, y, col):
    r, g, b = (int(col[i:i+2], 16) for i in (0, 2, 4))
    return x <= 25 and y >= 22 and b > g + 3

body, cape, flame = {}, {}, {}
for m in re.finditer(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="#([0-9A-Fa-f]{6})"', SRC):
    x0, y0, w, h = map(int, m.groups()[:4]); col = m.group(5).upper()
    for dx in range(w):
        for dy in range(h):
            x, y = x0 + dx, y0 + dy
            if col in FLAME_COLS and x >= 44: flame[(x, y)] = col
            elif is_cape(x, y, col):          cape[(x, y)] = col
            else:                             body[(x, y)] = col

def leg_offsets(f):
    """(hip_dx, foot_dx, lift) for the back leg and the front leg. In the idle stance the feet are 11 px
    apart, so each foot is first centred under the body and then swung +-6 px in opposite phase:
    the feet pass each other twice per cycle, like a real stride."""
    ph = 2 * math.pi * f / N
    out = []
    for sgn in (1, -1):                                   # back leg (+), front leg (-)
        s, c = math.sin(ph), sgn * math.cos(ph)
        foot = sgn * (5 + 6 * s)
        hip = round(0.45 * foot)                          # the hip follows part of the way, so the leg stays upright
        lift = 2 if c > 0.7 else 1 if c > 0.2 else 0      # the foot swinging forward is off the ground
        out.append((hip, round(foot), lift))
    return out

def flame_pixels(f):
    ff = (f * 2) % 8                                          # flame flickers at the idle's rate
    px = {}
    for (x, y), col in flame.items():
        h = BASE_Y - y
        if h >= 13 and col != "F0F2F3" and ff in (2, 6): continue
        sway = round(1.5 * (h / 14) * math.sin(2 * math.pi * ff / 8 + h * 0.45)) - (1 if h > 6 else 0)   # tip trails back
        if col == "076CC2" and h < 8 and (x + y + ff) % 4 == 0: col = "78A0C6"
        px[(x + sway, y)] = col
    return px

def make_frame(f):
    ph = 2 * math.pi * f / N
    bob = -1 if abs(math.sin(ph)) < 0.5 else 0               # body rises as the legs pass each other
    legs = leg_offsets(f)
    px = {}

    # cape: moves with the body and trails back a little, more toward the hem. Each row is shifted at most
    # 1 px more than the row above (so it never tears), and the gap a shifted row leaves next to the body is
    # filled with that row's edge colour (so it stays attached at the shoulder and side).
    rows = {}
    for (x, y), c in cape.items(): rows.setdefault(y, []).append((x, c))
    prev = 0
    for y in sorted(rows):
        k = max(0.0, (y - 28) / 22)
        want = round(k * (1.2 + 1.0 * math.sin(ph - (y - 28) * 0.08)))
        shift = max(prev - 1, min(prev + 1, want))
        prev = shift
        row = rows[y]
        for x, c in row: px[(x - shift, y + bob)] = c
        if shift > 0:
            edge_x, edge_c = max(row)
            for gx in range(edge_x - shift + 1, edge_x + 1): px.setdefault((gx, y + bob), edge_c)
    if bob:   # the body rose 1 px: repeat the cape's bottom row so the hem doesn't lift off the legs' side
        y = max(rows); shift = prev
        for x, c in rows[y]: px.setdefault((x - shift, y), c)

    bpx = {}
    robe_first = sorted(body.items(), key=lambda it: not (it[0][1] >= HIP_Y and (int(it[1][4:6], 16) > int(it[1][2:4], 16) + 3 or (it[0][0] < BACK_LEG_X0 and it[0][1] < 52))))
    for (x, y), c in robe_first:
        if (x, y) in EYES: c = "F50F96" if f % 4 < 2 else "FF7AC8"
        r_, g_, b_ = (int(c[i:i+2], 16) for i in (0, 2, 4))
        if y >= HIP_Y and (b_ > g_ + 3 or (x < BACK_LEG_X0 and y < 52)):   # robe (and its outline) behind the legs stays put, so no hole opens
            bpx.setdefault((x, y), c); continue
        if y >= HIP_Y:                                         # legs: shear from the hip, lift near the foot
            hip, foot, lift = legs[0] if x <= SPLIT_X else legs[1]
            k = (y - HIP_Y) / (FOOT_Y - HIP_Y)
            ny = y - (round(lift * k) if y >= HIP_Y + 4 else 0)
            bpx[(x + round(hip + (foot - hip) * k), ny)] = c
        else:
            bpx[(x, y + bob)] = c
            if bob and y == HIP_Y - 1: bpx[(x, y)] = c          # repeat the seam row so the raised body leaves no gap
    # hanging arm swings opposite to the back leg
    arm = {p: c for p, c in bpx.items() if p[0] <= ARM_X1 and ARM_Y0 + bob <= p[1] <= ARM_Y1 + bob}
    for p in arm: del bpx[p]
    for (x, y), c in arm.items():
        bpx[(x - round(2.2 * math.sin(ph) * max(0, y - bob - 23) / 15), y)] = c
    px.update(bpx)

    for (x, y), col in flame_pixels(f).items(): px[(x, y + bob)] = col

    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for (x, y), col in px.items():
        if 0 <= x < 64 and 0 <= y < 64: img.putpixel((x, y), hx(col))
    return img

sheet = Image.new("RGBA", (64 * N, 64), (0, 0, 0, 0))
for f in range(N): sheet.alpha_composite(make_frame(f), (f * 64, 0))
sheet.save(sys.argv[2])
print("saved", sys.argv[2], sheet.size)
