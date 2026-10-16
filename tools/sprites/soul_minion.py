"""Soul Summoner's summoned soul: a burning skull flame (art by the designer).
Run:  python3 tools/sprites/soul_minion.py tools/sprites/soul_minion.png public/assets/fighters/soul-summoner/soul_minion_sheet.png
Input: the 52x56 pixel art (extracted 1:1 from the designer's image). Output: 12 frames side by side,
each 60x68 (4 px padding on the sides and bottom, 8 px on top for flame tongues and sparks), played at 20 fps.

Wild flicker: the flame rows above the skull lash sideways with two out-of-step waves, tongues of
flame leap off the top and sides and snap back each frame, the flame's colours churn and flash
brighter on random frames, and a spray of sparks flies off the tail. The skull never moves.
Everything comes from a fixed hash, so the loop plays the same every time.
"""
import math, sys
from PIL import Image

N, PAD_X, PAD_TOP, FW, FH = 12, 4, 8, 60, 68
src = Image.open(sys.argv[1]).convert("RGBA")
W, H = src.size
px = {(x, y): src.getpixel((x, y))[:3] for x in range(W) for y in range(H) if src.getpixel((x, y))[3] > 0}

OUTLINE = [(0x00, 0x00, 0x00), (0x28, 0x01, 0x81), (0x2D, 0x08, 0x7F)]
CYAN, CYAN_DIM = (0x61, 0xFF, 0xEF), (0x70, 0x5E, 0xB0)
# flame body colours from dark to light; flicker moves pixels up and down this ramp
RAMP = [(0x44, 0x16, 0x93), (0x4D, 0x34, 0x92), (0x60, 0x54, 0x9D), (0x62, 0x59, 0x9E), (0x70, 0x5E, 0xB0), (0x8B, 0x6F, 0xB9), (0xB5, 0xA2, 0xDD)]
SKULL_LIGHT, SKULL_BRIGHT = (0xF8, 0xE6, 0xFC), (0xFD, 0xFA, 0xFE)

def h(*a):  # deterministic 0..1 hash
    n = 0
    for v in a: n = (n * 2654435761 + v * 40503 + 12345) & 0xFFFFFFFF
    n ^= n >> 13; n = (n * 1274126177) & 0xFFFFFFFF; n ^= n >> 16
    return n / 0xFFFFFFFF

def is_skull(x, y):  # the pale skull and its glow stay still
    return 8 <= x <= 31 and 25 <= y <= 51

def frame(f):
    out = {}
    ph = 2 * math.pi * f / N
    flash = h(f, 7) < 0.3                               # some frames flare brighter
    for (x, y), c in px.items():
        nx, ny = x, y
        if not is_skull(x, y):
            # two out-of-step waves make the lashing irregular; stronger toward the tail tip
            amp = 0.0 if y >= 25 else 2.6 * (25 - y) / 25 + 0.5
            wave = math.sin(ph + y * 0.22) + 0.55 * math.sin(3 * ph + y * 0.5 + 1.3)
            nx = x + round(amp * wave / 1.4)
            if c in RAMP:                                # churning colours
                i = RAMP.index(c)
                r = h(x, y, f)
                if r < 0.25: i -= 1
                elif r < 0.5: i += 1
                if flash: i += 1
                c = RAMP[max(0, min(len(RAMP) - 1, i))]
        if c == CYAN and h(x, y, f, 3) < 0.45:
            c = CYAN_DIM                                 # highlights sparkle on and off
        if c == SKULL_LIGHT and (flash or f % 4 == 0):
            c = SKULL_BRIGHT                             # the skull glows with the flare
        out[(nx, ny)] = c

    # flame tongues: from top-edge pixels of the flame, licks of fire 3-7 px tall leap up and snap back
    edge = [(x, y) for (x, y) in out if not is_skull(x, y) and out[(x, y)] in OUTLINE and (x, y - 1) not in out and (x, y + 1) in out]
    used = set()
    for (x, y) in sorted(edge):
        if h(x, y, f, 11) > 0.16 or any(abs(x - u) < 4 for u in used):
            continue
        used.add(x)
        tall = 3 + int(h(x, y, f, 12) * 5)
        lean = (-1 if h(x, f, 13) < 0.5 else 1) if tall > 4 else 0
        for k in range(1, tall + 1):
            cx = x + (lean if k > tall // 2 else 0)
            half = 1 if k <= tall // 2 else 0              # 3 px wide at the root, 1 px at the tip
            for dx in range(-half, half + 1):
                p = (cx + dx, y - k)
                if p not in out:
                    out[p] = RAMP[5] if dx == 0 and k < tall else RAMP[3]
            for side in (cx - half - 1, cx + half + 1):  # dark outline around the lick
                if (side, y - k) not in out: out[(side, y - k)] = OUTLINE[1]
        tip = (x + lean, y - tall - 1)
        if tip not in out: out[tip] = OUTLINE[1]
        out[(x, y)] = RAMP[4]                            # the lick's root glows
    # a spray of sparks flying off the tail and top
    for k in range(7):
        t = (f + k * 5) % N
        if t < 8:
            sx = 30 + int(h(k, 21) * 22) + int((h(k, t, 22) - 0.5) * 3)
            sy = 4 - t * 2 + int(h(k, 23) * 6)
            col = [CYAN, RAMP[6], RAMP[5], SKULL_LIGHT][k % 4]
            out[(sx, sy)] = col
            if t < 3: out[(sx, sy + 1)] = RAMP[4]
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    for (x, y), c in out.items():
        X, Y = x + PAD_X, y + PAD_TOP
        if 0 <= X < FW and 0 <= Y < FH:
            img.putpixel((X, Y), c + (255,))
    return img

sheet = Image.new("RGBA", (FW * N, FH), (0, 0, 0, 0))
for f in range(N):
    sheet.alpha_composite(frame(f), (f * FW, 0))
sheet.save(sys.argv[2])
print("saved", sys.argv[2], sheet.size)
