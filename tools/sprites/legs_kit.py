"""Shaped legs for the puppet-rig fighters (THE DEVOTED, WHAT ONCE WAS, ROSEMARY).

The old legs were two straight `limb` tubes per leg, drawn a pixel or two off the rig's joints - the knees popped
apart when the rig bent them and the shins read as sticks. Everything here is drawn ON the joints the rig turns
round (pass the pivots from the fighter's RIG), and:
  - `seg`    one leg segment as a tapered shape: its width at each end, a bulge (thigh / calf) part-way along, and
             round ends, so the thigh's knee end and the shin's knee end overlap into one rounded knee at any bend.
  - `along`  points along a segment, offset to one side (stripes, seams, laces, creases).
  - `shoe`   a shoe / boot foot by kind: 'point' (a pointed dress shoe), 'clog', 'boot' (a chunky boot with a
             tread), 'rain' (a rounded rain boot), 'loafer', 'bare'. Heel at the ankle's x, toe forward, sole on `floor`.
"""
import math

def _pts(a, b, wa, wb, bulge, at, n=12):
    """The outline of a tapered segment from a to b: left side down, right side back up."""
    ax, ay = a; bx, by = b
    L = math.hypot(bx - ax, by - ay) or 1
    nx, ny = -(by - ay) / L, (bx - ax) / L                 # unit normal
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        w = wa + (wb - wa) * t + bulge * math.exp(-((t - at) / 0.28) ** 2)
        x, y = ax + (bx - ax) * t, ay + (by - ay) * t
        left.append((x + nx * w / 2, y + ny * w / 2)); right.append((x - nx * w / 2, y - ny * w / 2))
    return left + right[::-1]

def seg(d, a, b, wa, wb, col, bulge=0.0, at=0.4, cap_a=True, cap_b=True):
    """A leg segment from joint a to joint b, wa / wb px wide at the ends, `bulge` px extra at `at` (0..1 along it)."""
    d.polygon([(round(x), round(y)) for x, y in _pts(a, b, wa, wb, bulge, at)], fill=col)
    for (x, y), w, on in ((a, wa, cap_a), (b, wb, cap_b)):
        if on:
            r = w / 2 - 0.5
            d.ellipse([x - r, y - r, x + r, y + r], fill=col)

def along(a, b, off=0.0, t0=0.0, t1=1.0, step=1.0):
    """Integer points from a to b (from t0 to t1 of the way), `off` px to the right of the direction of travel."""
    ax, ay = a; bx, by = b
    L = math.hypot(bx - ax, by - ay) or 1
    nx, ny = -(by - ay) / L, (bx - ax) / L
    out, seen = [], set()
    k = 0.0
    while k <= L * (t1 - t0) + 1e-6:
        t = t0 + k / L
        p = (round(ax + (bx - ax) * t - nx * off), round(ay + (by - ay) * t - ny * off))
        if p not in seen: seen.add(p); out.append(p)
        k += step
    return out

def shoe(d, ank, col, kind='point', floor=58, toe=1, length=None, top=None):
    """A foot for the shoe part: heel under the ankle, toe pointing `toe` (+1 = right/forward). Returns the polygon."""
    x, y = ank
    f = lambda pts: [(x + px * toe, py) for px, py in pts]
    if kind == 'point':       # a long pointed dress shoe, low heel
        L = length or 9; t = top or y - 1
        p = f([(-3, t), (2, t), (4, floor - 3), (L - 2, floor - 2), (L, floor - 1), (L - 1, floor), (-3, floor), (-4, floor - 2)])
    elif kind == 'clog':      # a chunky rounded clog on a thick sole
        L = length or 8; t = top or y - 2
        p = f([(-3, t), (3, t), (6, floor - 4), (L, floor - 3), (L + 1, floor - 1), (L, floor), (-4, floor), (-4, floor - 3)])
    elif kind == 'boot':      # a heavy lace-up boot: square toe, deep tread
        L = length or 8; t = top or y - 3
        p = f([(-3, t), (3, t), (3, floor - 4), (L - 1, floor - 4), (L, floor - 2), (L, floor), (-4, floor), (-4, floor - 2)])
    elif kind == 'rain':      # a round-toed rain boot
        L = length or 7; t = top or y - 1
        p = f([(-2, t), (2, t), (3, floor - 3), (L - 1, floor - 3), (L, floor - 2), (L, floor), (-3, floor), (-3, floor - 2)])
    elif kind == 'loafer':    # a scuffed office loafer
        L = length or 8; t = top or y
        p = f([(-3, t), (2, t), (5, floor - 3), (L - 1, floor - 2), (L, floor), (-3, floor), (-4, floor - 1)])
    else:                     # 'bare': a long bare foot
        L = length or 9; t = top or y - 1
        p = f([(-2, t), (2, t), (5, floor - 2), (L, floor - 1), (L, floor), (-3, floor), (-3, floor - 2)])
    d.polygon(p, fill=col)
    return p
