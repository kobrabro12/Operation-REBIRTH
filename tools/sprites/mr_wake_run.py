"""Mr Wake's run: a real stride with both legs and boots moving, built on top of his idle animation.
Run:  python3 tools/sprites/mr_wake_run.py tools/sprites/mr_wake_idle.svg public/assets/fighters/mr-wake/run_sheet.png
(mr_wake_roses.py builds the ROSEBUD costume's run the same way.)
Output: an 8-frame sheet, 64x64 per frame, feet on row 61 like the idle.

Each frame starts from an idle frame (so the gem still pulses and the energy still flickers), then:
  - his original legs and boots under the robe are erased
  - two legs are drawn from the hips under the hem: dark trousers down to pointed black boots. They swing
    in opposite directions on a stride cycle; the leg swinging forward lifts its boot off the ground
    while the planted one pushes back flat on the floor. The far leg is drawn a shade darker.
  - his upper body leans one pixel forward into the run and bobs: up as his legs pass each other,
    down at full stride
  - the long cloak tail behind him streams back, more at the bottom, flapping with the stride
"""
import importlib.util, math, os, sys

spec = importlib.util.spec_from_file_location('mr_wake', os.path.join(os.path.dirname(__file__), 'mr_wake.py'))
mw = importlib.util.module_from_spec(spec); _argv = sys.argv; sys.argv = [sys.argv[0]]; spec.loader.exec_module(mw); sys.argv = _argv
from PIL import Image

N = 8
OUTLINE, TROUSER, TROUSER_FAR, BOOT, BOOT_LIT, BOOT_CAP = '070405', '1B161C', '0C0A0E', '2C2828', '443D4A', '545150'
LEG_COLS = {'070405', '1B161C', '2C2828', '443D4A', '545150', '33293C'}
HIPS = [(26, 54), (37, 54)]          # far leg (behind), near leg (in front)
GROUND = 61

def idle_pixels(px, f):
    """The idle frame f as {(x, y): 'RRGGBB'} in the SVG's own colours."""
    img = mw.frame(px, f)
    p = img.load(); out = {}
    for y in range(64):
        for x in range(64):
            c = p[x, y]
            if c[3]: out[(x, y)] = '%02X%02X%02X' % c[:3]
    return out

def line(a, b):
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]

def leg(out, hip, ph, far):
    """One leg at stride phase ph (radians). sin > 0: foot ahead; cos > 0: swinging forward (lifted)."""
    s, c = math.sin(ph), math.cos(ph)
    fx = hip[0] + 1 + round(7 * s)
    lift = round(3 * c) if c > 0 else 0
    fy = GROUND - lift                                  # sole row
    knee = (round(hip[0] + 1 + 3 * s + (2 if c > 0 else 0)), hip[1] + 3 - (1 if c > 0 else 0))   # knee juts forward on the swing
    ankle = (fx, fy - 2)
    tr = TROUSER_FAR if far else TROUSER
    pts = line(hip, knee) + line(knee, ankle)
    for (x, y) in pts:                                  # outline first, then the 2-px trouser leg
        for dx in (-1, 0, 1, 2):
            if dx in (-1, 2): out.setdefault((x + dx, y), OUTLINE)
    for (x, y) in pts:
        out[(x, y)] = tr; out[(x + 1, y)] = tr
    # boot: pointed toe facing forward (right), heel at the ankle; tilts toe-up when lifted forward
    toe_up = 1 if c > 0.3 else 0
    for dx in range(-1, 6):
        for dy in range(-2, 1):
            y = fy + dy - (toe_up if dx >= 3 and dy == 0 else 0)
            if dx == 5 and dy < 0: continue             # pointed toe
            out[(fx + dx, y)] = BOOT
    for dx in range(-2, 7):                             # sole and outline around the boot
        out.setdefault((fx + dx, fy + 1 - (toe_up if dx >= 3 else 0)), OUTLINE)
        if dx < 5: out.setdefault((fx + dx, fy - 3), OUTLINE)
    if not far:
        out[(fx + 1, fy - 2)] = BOOT_LIT; out[(fx + 2, fy - 2)] = BOOT_LIT; out[(fx + 4, fy - 1 - toe_up)] = BOOT_CAP

def run_frame(px, f, recolor=None):
    ph = 2 * math.pi * f / N
    src = idle_pixels(px, (f * 4) % 32)
    bob = -1 if f % 4 in (0, 1) else 0                  # legs passing: up; full stride: down
    out = {}
    for (x, y), c in src.items():
        if y >= 54 and x >= 15 and (c in LEG_COLS or (y >= 57 and x >= 21)):   # his old legs and boots
            continue
        nx, ny = x, y + bob                             # the whole body bobs with the stride
        if y <= 45: nx += 1                             # lean into the run
        elif x < 34:                                    # cloak tail streaming back, flapping with the stride
            k = (y - 45) / 11
            nx -= round(k * (1.5 + 1.2 * math.sin(ph * 2 + y * 0.4)))
        if bob and y == 56 and (x, y + 1) not in src: out.setdefault((nx, y), c)   # keep the hem's bottom row so no gap opens
        out[(nx, ny)] = c
    legs = {}
    leg(legs, HIPS[0], ph + math.pi, True)              # the far leg, half a stride out of step
    for k, v in legs.items():
        if k not in out or k[1] > 55: out[k] = v
    legs = {}
    leg(legs, HIPS[1], ph, False)
    for k, v in legs.items():
        if k[1] >= 55 or k not in out: out[k] = v       # the near leg overlaps the far one below the hem
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    for (x, y), c in out.items():
        if 0 <= x < 64 and 0 <= y < 64:
            img.putpixel((x, y), mw.hx(recolor.get(c, c) if recolor else c))
    return img

def build_run(px, out_path, recolor=None):
    sheet = Image.new('RGBA', (64 * N, 64), (0, 0, 0, 0))
    for f in range(N): sheet.alpha_composite(run_frame(px, f, recolor), (f * 64, 0))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    sheet.save(out_path); print('saved', out_path, sheet.size)

if __name__ == '__main__':
    build_run(mw.load_svg(sys.argv[1]), sys.argv[2])
