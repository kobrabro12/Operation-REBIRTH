"""1-BIT minion: the soul Soul Summoner raises when he wears his 1-BIT costume.
Run:  python3 tools/sprites/onebit_minion.py public/assets/fighters/soul-summoner/onebit_minion_sheet.png
12 frames of 60x68 side by side - the same frame size and anchor as soul_minion_sheet.png, so it drops
straight into the game (the head's centre sits at (23, 45), facing left).

Only two colours: a black ghost with a crisp white outline, hollow white eyes, a jagged white grin and
a wavy tail that streams up and back behind it. The tail ripples, the head bobs a pixel, the eyes blink
once per loop and little white sparks drift off the tail tip.
"""
import math, sys
from PIL import Image

N, FW, FH = 12, 60, 68
K, W = (14, 14, 16, 255), (244, 244, 240, 255)

def frame(f):
    ph = 2 * math.pi * f / N
    bob = 1 if f % 6 < 3 else 0
    body = set()
    cx, cy, r = 23, 44 + bob, 10
    for y in range(cy - r, cy + r + 1):                               # round head, slightly squashed at the chin
        for x in range(cx - r - 1, cx + r + 2):
            if ((x - cx) / (r + 0.6)) ** 2 + ((y - cy) / r) ** 2 <= 1: body.add((x, y))
    for k in range(1, 16):                                            # tail: shrinking blobs along a rippling curve
        t = k / 15
        tx = cx + 4 + t * 20 + math.sin(ph * 2 - t * 5) * 2.5 * t
        ty = cy - 4 - t * 24 + math.cos(ph - t * 4) * 1.5 * t
        rr = 6.5 * (1 - t) + 1.2
        for y in range(int(ty - rr) - 1, int(ty + rr) + 2):
            for x in range(int(tx - rr) - 1, int(tx + rr) + 2):
                if (x - tx) ** 2 + (y - ty) ** 2 <= rr * rr: body.add((x, y))
    img = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); px = img.load()
    for (x, y) in body:
        if 0 <= x < FW and 0 <= y < FH: px[x, y] = K
    for (x, y) in body:                                               # 1 px white outline all round
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Y = x + dx, y + dy
            if (X, Y) not in body and 0 <= X < FW and 0 <= Y < FH: px[X, Y] = W
    blink = f == 7
    for ex in (cx - 6, cx + 1):                                       # hollow eyes (looking left), black pupils
        ey = cy - 3
        if blink:
            for dx in range(4): px[ex + dx, ey + 1] = W
        else:
            for dx in range(4):
                for dy in range(4):
                    edge = dx in (0, 3) or dy in (0, 3)
                    corner = dx in (0, 3) and dy in (0, 3)
                    if edge and not corner: px[ex + dx, ey + dy] = W
            px[ex + 1, ey + 2] = W                                    # pupil glint
    for i, x in enumerate(range(cx - 7, cx + 4)):                     # jagged grin
        px[x, cy + 4 + (i % 2)] = W
    for k in range(3):                                                # sparks drifting off the tail tip
        t = (f + k * 4) % N
        if t < 9:
            sx = 44 + k * 3 + (t // 3) % 2
            sy = 14 - t - k * 2 + bob
            if 0 <= sx < FW and 0 <= sy < FH: px[sx, sy] = W
    return img

sheet = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))
for f in range(N): sheet.alpha_composite(frame(f), (f * FW, 0))
sheet.save(sys.argv[1])
print('saved', sys.argv[1])
