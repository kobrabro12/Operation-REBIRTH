"""Mr Wake idle animation: stepped, whole-pixel idle built from the 64x64 SVG.
Run:  python3 tools/sprites/mr_wake.py tools/sprites/mr_wake_idle.svg public/assets/fighters/mr-wake/idle_sheet.png
Output: a 32-frame sheet (64x64 per frame, 10 fps), same layout as Soul Summoner's sheets.

Motion: the hat, head, cloak and staff breathe up 1 px together (the hat lags a frame behind),
the cloak hem sways in 3-row bands, the gem pulses brighter, and the purple energy around
the gem flickers. Everything is looked up from small tables so it loops cleanly, no randomness.
"""
import math, re, sys
from PIL import Image

N = 32
GEM = {(x, y) for x in range(9, 19) for y in range(11, 20)}       # the purple gem on the staff head
GLOW_COLS = {"6D26BD", "DAB8FE", "560C83"}

def load_svg(path):
    """The SVG's pixels as {(x, y): 'RRGGBB'}."""
    src = open(path).read()
    px = {}
    for m in re.finditer(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="#([0-9A-Fa-f]{6})"', src):
        x0, y0, w, h = map(int, m.groups()[:4]); col = m.group(5).upper()
        for dx in range(w):
            for dy in range(h):
                px[(x0 + dx, y0 + dy)] = col
    return px

def hx(s): return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
def breath(f): return 0.5 * (1 - math.cos(2 * math.pi * f / 16))

def frame(px, f, recolor=None):
    up = -1 if breath(f) > 0.55 else 0                 # chest, head, staff
    hat = -1 if breath(f - 2) > 0.55 else 0            # hat brim lags behind
    hat = min(hat, up) if up else hat
    pulse = f % 8                                      # gem cycle, 0.8 s
    out = {}
    for (x, y), c in px.items():
        energy = c in GLOW_COLS and (x, y) not in GEM and x < 20
        if energy:
            # loose energy strands around the gem drift sideways and blink
            sway = round(math.sin(2 * math.pi * f / 8 + y * 0.5))
            if (x + y + f) % 6 == 0:
                continue
            out[(x + sway, y + up)] = c
            continue
        if y in (10, 45) and (x, y) not in out:      # seam rows: keep a copy in place so no gap opens
            out[(x, y)] = c
        if y <= 10 and x >= 28:                        # hat
            ny = y + hat
        elif y <= 45:                                   # head, body, staff
            ny = y + up
        else:                                           # cloak hem sways in bands
            band = 46 + 3 * ((y - 46) // 3)
            amp = min(1.0, (band - 46) / 9) * 1.4
            out[(x + round(amp * math.sin(2 * math.pi * (f // 2 * 2) / 16 - (band - 46) * 0.3)), y)] = c
            continue
        if (x, y) in GEM:
            # gem pulse: the highlight pixels flash white, the dark facets brighten
            if c == "DAB8FE" and pulse in (0, 1):
                c = "FFFFFF"
            elif c == "560C83" and pulse in (2, 3):
                c = "6D26BD"
            elif c == "6D26BD" and pulse in (0, 1) and (x + y) % 2 == 0:
                c = "9B5DE5"
        out[(x, ny)] = c
    # a few sparks rising off the gem
    for k, (sx, col) in enumerate([(12, "DAB8FE"), (15, "9B5DE5"), (10, "6D26BD")]):
        t = (f + k * 3) % 8
        if t < 5:
            out[(sx + (1 if (t + k) % 4 in (1, 2) else 0), 9 - t * 2 + k + up)] = col
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for (x, y), c in out.items():
        if 0 <= x < 64 and 0 <= y < 64:
            img.putpixel((x, y), hx(recolor.get(c, c) if recolor else c))
    return img

def build(px, out_path, recolor=None):
    """Animate the pixels into the 32-frame idle sheet. `recolor` maps colours after animating
    (used by costumes, e.g. mr_wake_roses.py, so the gem and energy logic still finds its colours)."""
    sheet = Image.new("RGBA", (64 * N, 64), (0, 0, 0, 0))
    for f in range(N):
        sheet.alpha_composite(frame(px, f, recolor), (f * 64, 0))
    sheet.save(out_path)
    print("saved", out_path, sheet.size)

if __name__ == "__main__":
    build(load_svg(sys.argv[1]), sys.argv[2])
